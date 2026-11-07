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
