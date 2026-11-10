export type CsvRow = Record<string, string>;

/** Parse quoted CSV, including multiline cells, BOM and Excel semicolon files. */
export function parseImportCsv(text: string): CsvRow[] {
  text = text.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === delimiter || c === "\n" || c === "\r") {
      row.push(cell.trim());
      cell = "";
      closed = false;
      if (c !== delimiter) {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else if (c === '"' && !cell && !closed) quoted = true;
    else {
      if (closed || c === '"')
        throw new Error("CSV incorrecte: cometes mal tancades.");
      cell += c;
    }
  }
  if (quoted) throw new Error("CSV incorrecte: falta tancar unes cometes.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((h) => h.toLowerCase()) ?? [];
  if (
    !headers.length ||
    headers.some((h) => !h) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("La capçalera és buida o conté columnes duplicades.");
  if (!rows.length || rows.length > 200)
    throw new Error("El CSV ha de contenir entre 1 i 200 registres.");
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error(`Fila ${index + 2}: nombre de columnes incorrecte.`);
    return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
  });
}

function columns(row: CsvRow, allowed: string[], required: string[]) {
  if (Object.keys(row).some((key) => !allowed.includes(key)))
    throw new Error(`Columnes permeses: ${allowed.join(", ")}.`);
  for (const key of required)
    if (!row[key]) throw new Error(`Falta el camp ${key}.`);
}
export function importChallenges(rows: CsvRow[], existingIds: string[]) {
  const ids = new Set(existingIds);
  if (existingIds.length + rows.length > 30)
    throw new Error("Màxim 30 reptes per llista.");
  return rows.map((row, index) => {
    columns(
      row,
      ["id", "company", "title", "description", "published"],
      ["id", "company", "title"],
    );
    if (
      row.id.length > 80 ||
      row.company.length > 150 ||
      row.title.length > 150 ||
      (row.description?.length ?? 0) > 10000
    )
      throw new Error(
        `Fila ${index + 2}: algun camp supera la longitud permesa.`,
      );
    if (ids.has(row.id)) throw new Error(`Identificador duplicat: ${row.id}.`);
    ids.add(row.id);
    const published = (row.published || "false").toLowerCase();
    if (!["true", "false"].includes(published))
      throw new Error(`Fila ${index + 2}: published ha de ser true o false.`);
    return {
      id: row.id,
      company: row.company,
      title: row.title,
      description: row.description ?? "",
      published: published === "true",
      resources: [],
    };
  });
}
export function importMentors(
  rows: CsvRow[],
  existingNames: string[],
  candidateIds: number[],
) {
  const names = new Set(existingNames.map((n) => n.trim().toLocaleLowerCase()));
  const users = new Set<number>();
  return rows.map((row) => {
    columns(row, ["name", "user_id"], ["name"]);
    if (row.name.length < 2 || row.name.length > 150)
      throw new Error("El nom ha de tenir entre 2 i 150 caràcters.");
    const name = row.name.toLocaleLowerCase();
    if (names.has(name)) throw new Error(`Mentor duplicat: ${row.name}.`);
    names.add(name);
    if (!row.user_id) return { name: row.name };
    const user_id = Number(row.user_id);
    if (
      !Number.isSafeInteger(user_id) ||
      !candidateIds.includes(user_id) ||
      users.has(user_id)
    )
      throw new Error(`Compte de mentor desconegut o repetit: ${row.user_id}.`);
    users.add(user_id);
    return { name: row.name, user_id };
  });
}
