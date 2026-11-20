import { describe, expect, it } from "vitest";
import { participantsCsv, type ParticipantExport } from "./participant-export";

const participant: ParticipantExport["participants"][number] = {
  id: 7,
  name: 'Àlex, "Prova"',
  email: "=test@example.test",
  nickname: "alex",
  status: "accepted",
  confirmed_assistance: true,
  checked_in: false,
  teams: ["Equip A"],
  eaten_meal_ids: [2],
  wants_credit: false,
  ticket_sent_at: null,
  cancelled_at: null,
};
describe("participant export", () => {
  it("exports all statuses with separate confirmation, attendance and each meal", () => {
    const csv = participantsCsv({
      meals: [
        { id: 1, name: "Dinar" },
        { id: 2, name: "Dinar" },
      ],
      participants: [
        participant,
        { ...participant, id: 8, status: "pending", eaten_meal_ids: [] },
        { ...participant, id: 9, status: "rejected" },
        { ...participant, id: 10, status: "cancelled" },
      ],
    });
    expect(csv.split("\r\n")).toHaveLength(5);
    expect(csv).toContain('"Àpat: Dinar (#1)","Àpat: Dinar (#2)"');
    expect(csv).toContain('"Acceptat","Sí","No","Equip A","Sí","1","No","Sí"');
    expect(csv).toContain(
      '"Pendent","No aplica","No","Equip A","No","0","No","No"',
    );
    expect(csv).toContain('"Rebutjat","No aplica"');
    expect(csv).toContain('"Plaça cancel·lada","No aplica"');
    expect(csv).toContain('"Àlex, ""Prova"""');
    expect(csv).toContain('"\'=test@example.test"');
    expect(csv).toContain('"Desconegut"');
  });
  it("preserves headers for empty events and does not count duplicate or unrelated meals", () => {
    expect(
      participantsCsv({ meals: [], participants: [] }).split("\r\n"),
    ).toHaveLength(1);
    const csv = participantsCsv({
      meals: [{ id: 2, name: "Sopar" }],
      participants: [{ ...participant, eaten_meal_ids: [2, 2, 999] }],
    });
    expect(csv).toContain('"Equip A","Sí","1","Sí"');
  });
});
