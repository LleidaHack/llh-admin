import type { HackerProfile } from "./api";
import { normalizeSearch } from "./search";
import { studyCenter } from "./study-centers";

export const statisticLabels: Record<string, string> = {
  food_restrictions: "Intoleràncies i restriccions alimentàries",
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
        const label = statisticValueLabel(field, value);
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

export function statisticValueLabel(field: string, value: unknown): string {
  const raw =
    typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (field === "study_center")
    return studyCenter(raw)?.label ?? "Sense especificar";
  if (!raw || raw === "-" || raw === "null") return "Sense especificar";
  if (
    field === "food_restrictions" &&
    ["no", "none", "cap", "ninguna", "ninguno", "sense restriccions"].includes(
      normalizeSearch(raw),
    )
  )
    return "Sense restriccions";
  return raw;
}

export type StatisticsParticipant = HackerProfile & { id: number };
export function participantStatistics(participants: StatisticsParticipant[]) {
  const unique = [
    ...new Map(participants.map((person) => [person.id, person])).values(),
  ];
  return Object.keys(statisticLabels).map((field) => {
    const groups = new Map<
      string,
      { label: string; participants: StatisticsParticipant[] }
    >();
    for (const person of unique) {
      const label = statisticValueLabel(
        field,
        person[field as keyof HackerProfile],
      );
      const key = normalizeSearch(label);
      const group = groups.get(key) ?? { label, participants: [] };
      group.participants.push(person);
      groups.set(key, group);
    }
    return {
      field,
      label: statisticLabels[field],
      groups: [...groups.values()].sort(
        (a, b) =>
          b.participants.length - a.participants.length ||
          a.label.localeCompare(b.label, "ca"),
      ),
    };
  });
}
