import { describe, expect, it } from "vitest";
import { groupEventStatistics } from "./event-statistics";

describe("groupEventStatistics", () => {
  it("counts repeated responses and normalizes accents, case and whitespace without merging distinct places", () => {
    expect(
      groupEventStatistics({
        location: [
          " Lleida ",
          "LLEIDA",
          "Tàrrega",
          "tarrega",
          "Vilanova de Bellpuig",
          "Vilanova i la Geltrú",
          null,
          "  ",
        ],
      }),
    ).toEqual({
      location: {
        Lleida: 2,
        Tàrrega: 2,
        "Sense especificar": 2,
        "Vilanova de Bellpuig": 1,
        "Vilanova i la Geltrú": 1,
      },
    });
  });
  it("groups studies and already-counted referral responses without losing totals", () => {
    expect(
      groupEventStatistics({
        studies: ["Enginyeria  Informàtica", "enginyeria informatica"],
        how_did_you_meet_us: { Instagram: 3, " instagram ": 2 },
      }),
    ).toEqual({
      studies: { "Enginyeria Informàtica": 2 },
      how_did_you_meet_us: { Instagram: 5 },
    });
  });
  it("preserves institution aliases and groups unknown institution variants", () => {
    expect(
      groupEventStatistics({
        study_center: [
          "UdL",
          "Universitat de Lleida",
          "Example School",
          "example school",
        ],
      }),
    ).toEqual({ study_center: { UdL: 2, "Example School": 2 } });
  });
  it("sorts by descending count and leaves unrelated or malformed fields untouched", () => {
    const result = groupEventStatistics({
      location: ["Barcelona", "Lleida", "Lleida"],
      total: 3,
      studies: [{ name: "x" }],
    }) as Record<string, unknown>;
    expect(Object.keys(result.location as object)).toEqual([
      "Lleida",
      "Barcelona",
    ]);
    expect(result.total).toBe(3);
    expect(result.studies).toEqual([{ name: "x" }]);
    expect(groupEventStatistics(null)).toBe(null);
  });
});

import { participantStatistics } from "./event-statistics";
import { dietaryWarning } from "./dietary";

it("keeps dietary participants attached to each count and preserves original answers", () => {
  const people = [
    {
      id: 1,
      name: "First",
      confirmed_assistance: true,
      food_restrictions: "Lactosa",
    },
    {
      id: 2,
      name: "Second",
      confirmed_assistance: true,
      food_restrictions: " lactosa ",
    },
    { id: 3, confirmed_assistance: true, food_restrictions: null },
    { id: 4, confirmed_assistance: true, food_restrictions: "No" },
    {
      id: 5,
      confirmed_assistance: true,
      food_restrictions: "Gluten i lactosa",
    },
  ];
  const category = participantStatistics([...people, people[0]])[0];
  expect(category.field).toBe("food_restrictions");
  expect(category.groups[0].participants.map((p) => p.id)).toEqual([1, 2]);
  expect(category.groups[0].participants[1].food_restrictions).toBe(
    " lactosa ",
  );
  expect(category.groups.reduce((n, g) => n + g.participants.length, 0)).toBe(
    5,
  );
  expect(category.groups.map((g) => g.label)).toContain("Sense especificar");
  expect(category.groups.map((g) => g.label)).toContain("Sense restriccions");
});

it("only suppresses explicit negative dietary answers", () => {
  for (const value of [null, "", "No", " cap ", "Ninguna."])
    expect(dietaryWarning(value)).toBe("");
  expect(dietaryWarning("No puc prendre lactosa")).toBe(
    "No puc prendre lactosa",
  );
  expect(dietaryWarning("Gluten, fruits secs")).toBe("Gluten, fruits secs");
});

it("excludes unconfirmed people only from catering statistics", () => {
  const categories = participantStatistics([
    { id: 1, confirmed_assistance: true, food_restrictions: "Gluten" },
    { id: 2, confirmed_assistance: false, food_restrictions: "Lactosa" },
    { id: 3, food_restrictions: "Fruits secs" },
  ]);
  expect(
    categories
      .find((c) => c.field === "food_restrictions")
      ?.groups.flatMap((g) => g.participants)
      .map((p) => p.id),
  ).toEqual([1]);
  expect(
    categories.find((c) => c.field === "location")?.groups[0].participants,
  ).toHaveLength(3);
});
