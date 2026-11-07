import { normalizeSearch } from "./search";
import { studyCenter } from "./study-centers";

export const statisticLabels: Record<string, string> = {
  location: "Ubicació",
  studies: "Estudis",
  study_center: "Centre d'estudis",
  how_did_you_meet_us: "Com ens has conegut",
};

// Aggregate only known categorical fields, preserving the API and source records.
export function groupEventStatistics(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  return Object.fromEntries(
    Object.entries(data).map(([field, values]) => {
      if (!(field in statisticLabels)) return [field, values];
      const entries: [unknown, number][] = Array.isArray(values)
        ? values.map((value) => [value, 1])
        : values && typeof values === "object"
          ? (Object.entries(values) as [string, number][])
          : [];
      if (
        !entries.every(
          ([value, count]) =>
            (value == null || typeof value === "string") &&
            typeof count === "number" &&
            Number.isFinite(count) &&
            count >= 0,
        )
      )
        return [field, values];
      if (!Array.isArray(values) && (!values || typeof values !== "object"))
        return [field, values];
      const groups = new Map<string, { label: string; count: number }>();
      for (const [value, count] of entries) {
        const raw =
          typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
        const center = field === "study_center" ? studyCenter(raw) : undefined;
        const missing = !raw || raw === "-" || raw === "null";
        const label =
          field === "study_center"
            ? (center?.label ?? "Sense especificar")
            : missing
              ? "Sense especificar"
              : raw;
        const key = normalizeSearch(label);
      const group = groups.get(key);
        if (group) group.count += count;
        else groups.set(key, { label, count });
      }
      return [
        field,
        Object.fromEntries(
          [...groups.values()]
            .sort(
              (a, b) =>
                b.count - a.count || a.label.localeCompare(b.label, "ca"),
            )
            .map(({ label, count }) => [label, count]),
        ),
      ];
    }),
  );
}
