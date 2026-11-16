import { describe, expect, it } from "vitest";
import { creditsCsv } from "./credits";

describe("ECTS export", () => {
  it("exports names, emails and team presentation status safely for spreadsheets", () => {
    expect(
      creditsCsv([
        {
          name: 'Àlex, "Prova"',
          email: "=formula@example.test",
          team_presented: true,
        },
        {
          name: null,
          email: "participant@example.test",
          team_presented: false,
        },
      ]),
    ).toBe(
      '"Nom","Correu","Equip amb alguna presentació completada"\r\n"Àlex, ""Prova""","\'=formula@example.test","Sí"\r\n"","participant@example.test","No"',
    );
  });
  it("keeps column labels when nobody requested credits", () => {
    expect(creditsCsv([])).toBe(
      '"Nom","Correu","Equip amb alguna presentació completada"',
    );
  });
});
