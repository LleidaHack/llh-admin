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
