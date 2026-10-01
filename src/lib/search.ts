export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function searchIndex<T>(items: T[], text: (item: T) => string) {
  return items.map((item) => ({ item, text: normalizeSearch(text(item)) }));
}
export function searchItems<T>(
  index: { item: T; text: string }[],
  query: string,
) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return index
    .filter((entry) => terms.every((term) => entry.text.includes(term)))
    .map(({ item }) => item);
}
