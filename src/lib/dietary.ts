// Match only explicit negative answers; never infer safety from partial text.
export function dietaryWarning(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.!]+$/, "")
    .trim();
  return [
    "",
    "-",
    "null",
    "no",
    "none",
    "cap",
    "ninguna",
    "ninguno",
    "sense restriccions",
  ].includes(normalized)
    ? ""
    : text;
}
import { normalizeSearch } from "./search";

const dietaryAliases: Record<string, string[]> = {
  gluten: ["Gluten"],
  lactosa: ["Lactosa"],
  vegetariana: ["Vegetarià/ana"],
  vegetaria: ["Vegetarià/ana"],
  vegetarian: ["Vegetarià/ana"],
  porc: ["Sense porc"],
  "no pork": ["Sense porc"],
  halal: ["Halal"],
  "halal o en su defecto vegetariana, gracias": ["Halal o vegetarià"],
  "fruits secs": ["Fruits secs"],
  "fruits secs(tots)": ["Fruits secs"],
  "fruits secs (tots)": ["Fruits secs"],
  "frutos secos": ["Fruits secs"],
  "frutos secos, melocoton": ["Fruits secs", "Préssec"],
  "gluten i lactosa": ["Gluten", "Lactosa"],
  pescado: ["Peix"],
  peix: ["Peix"],
  "peixos i moluscos": ["Peix", "Mol·luscs"],
  "no me gusta el tomate": ["Preferència: sense tomàquet"],
};

export function dietaryLabels(value: unknown): string[] {
  const raw = typeof value === "string" ? value.trim() : "";
  const key = normalizeSearch(raw)
    .replace(/\s+/g, " ")
    .replace(/[.!]+$/, "")
    .trim();
  if (!key || key === "-" || key === "null") return ["Sense especificar"];
  if (!dietaryWarning(raw)) return ["Sense restriccions declarades"];
  return Object.hasOwn(dietaryAliases, key)
    ? dietaryAliases[key]
    : [`Per confirmar: ${raw}`];
}

export function groupDietaryResponses(
  responses: { restriction: string; count: number }[],
) {
  const groups = new Map<
    string,
    {
      label: string;
      count: number;
      originals: { restriction: string; count: number }[];
    }
  >();
  for (const response of responses) {
    for (const label of dietaryLabels(response.restriction)) {
      const group = groups.get(label) ?? { label, count: 0, originals: [] };
      group.count += response.count;
      group.originals.push(response);
      groups.set(label, group);
    }
  }
  return [...groups.values()].sort(
    (first, second) =>
      second.count - first.count ||
      first.label.localeCompare(second.label, "ca"),
  );
}
