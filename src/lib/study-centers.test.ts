import { describe, expect, it } from "vitest";
import { studyCenter } from "./study-centers";

const label = (raw: string) => studyCenter(raw)?.label;

describe("studyCenter", () => {
  it.each([
    ["UdL", "UdL"],
    ["udl", "UdL"],
    ["Universitat de Lleida ", "UdL"],
    ["EPS - UDL", "UdL"],
    ["Escola Politècnica Superior", "UdL"],
    ["Universitat de Lleida - Campus Cappont", "UdL"],
    ["URV", "URV"],
    ["Urv", "URV"],
    ["Universitat Rovira i Virgili (URV)", "URV"],
    ["Universitat Rovira y Virgili", "URV"],
    ["ETSE-URV", "URV"],
    ["UPC - FIB", "UPC"],
    ["Univertitat Politécnica de Catalunya", "UPC"],
    ["Facultat d'Informàtica de Barcelona (FIB)", "UPC"],
    ["UPC Manresa - EPSEM", "UPC"],
    [
      "Escola Politècnica Superior d'Enginyeria de Vilanova i la Geltrú. EPSEVG",
      "UPC",
    ],
    ["https://www.fib.upc.edu/es", "UPC"],
    ["La Salle Campus Barcelona - Universitat Ramon Llull", "La Salle (URL)"],
    ["ILERNA", "Ilerna"],
    ["IES Caparella", "Institut Caparrella"],
    ["Tecnocampus (UPF)", "UPF"],
  ])("%s → %s", (raw, expected) => {
    expect(label(raw)).toBe(expected);
  });

  it("keeps several institutions as written", () => {
    expect(label("UdL, UPC")).toBe("UdL, UPC");
    expect(label("Caparrella // UOC")).toBe("Caparrella // UOC");
  });

  it("groups unknown centres ignoring case, accents and spaces", () => {
    expect(studyCenter("Escola Pia  Mataró")?.key).toBe(
      studyCenter("escola pia mataro")?.key,
    );
  });

  it("treats placeholders as empty", () => {
    expect(studyCenter("-")).toBeNull();
    expect(studyCenter("string")).toBeNull();
    expect(studyCenter(null)).toBeNull();
  });
});
