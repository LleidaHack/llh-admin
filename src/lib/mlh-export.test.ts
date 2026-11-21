import { describe, expect, it } from "vitest";
import { mlhCsv } from "./mlh-export";
import type { ParticipantExport } from "./participant-export";

const participant: ParticipantExport["participants"][number] = {
  id: 7,
  name: "  Maria   Garcia López ",
  nickname: "maria",
  email: "maria@example.test",
  status: "accepted",
  checked_in: false,
  teams: [],
  eaten_meal_ids: [],
  wants_credit: null,
  ticket_sent_at: null,
  cancelled_at: null,
  age_at_event: 21,
  study_center: "UdL",
  studies: "University",
  location: "Lleida",
};

describe("MLH export", () => {
  it("exports MLH and communication preference headers even for empty events", () => {
    expect(mlhCsv([], [])).toBe(
      '"First name","Last name","Email","Phone number","Age","Country of residence","School","Current level of study","MLH Checkbox Responses","MLH Code of Conduct","Event Logistics Information","Communication from MLH","Receive notifications","Receive commercial communications"',
    );
  });

  it("matches profiles by ID and exports recorded consent without inferring missing data", () => {
    const csv = mlhCsv(
      [participant],
      [
        { id: 8, telephone: "wrong" },
        {
          id: 7,
          telephone: "+34612345678",
          config: { mlh_code_of_conduct: true },
        },
      ],
    );
    expect(csv.split("\r\n")[1]).toBe(
      '"Maria","Garcia López","maria@example.test","\'+34612345678","21","","UdL","University","MLH Code of Conduct: Yes","Yes","","","",""',
    );
    expect(csv).not.toContain("Lleida");
  });

  it("distinguishes false from unknown and preserves every registration status", () => {
    const csv = mlhCsv(
      [
        participant,
        { ...participant, id: 8, name: "Alex", status: "cancelled" },
      ],
      [{ id: 7, config: { mlh_code_of_conduct: false } }],
    );
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv).toContain('"MLH Code of Conduct: No","No","",""');
    expect(csv.split("\r\n")[2]).toContain('"Alex",""');
    expect(csv.split("\r\n")[2]).toMatch(/,"","","",""$/);
  });

  it.each([
    [true, false, '"Yes","No"'],
    [false, true, '"No","Yes"'],
    [null, undefined, '"",""'],
  ] as const)(
    "exports communication preferences independently (%s, %s)",
    (notifications, commercial, expected) => {
      const csv = mlhCsv(
        [participant],
        [
          {
            id: participant.id,
            config: {
              recive_notifications: notifications,
              comercial_notifications: commercial,
            },
          },
        ],
      );
      expect(csv.split("\r\n")[1]).toBe(
        '"Maria","Garcia López","maria@example.test","","21","","UdL","University","","","","",' +
          expected,
      );
    },
  );

  it("escapes quotes and neutralizes spreadsheet formulas", () => {
    const csv = mlhCsv(
      [{ ...participant, name: '=Name "Surname"', email: "@test" }],
      [],
    );
    expect(csv).toContain('"\'=Name","""Surname""","\'@test"');
  });
});
