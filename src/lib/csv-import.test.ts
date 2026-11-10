import { describe, it, expect } from "vitest";
import { parseImportCsv, importChallenges, importMentors } from "./csv-import";
describe("CSV imports", () => {
  it("reads BOM, semicolons, escaped quotes and multiline descriptions", () => {
    expect(
      parseImportCsv(
        '\uFEFFid;company;title;description\r\na;Rodi;"A ""title""";"First\nsecond"',
      )[0],
    ).toEqual({
      id: "a",
      company: "Rodi",
      title: 'A "title"',
      description: "First\nsecond",
    });
  });
  it("rejects malformed files before creating anything", () => {
    for (const csv of [
      "name,name\na,b",
      "name,user_id\nA",
      'name\n"open',
      "name\n",
    ])
      expect(() => parseImportCsv(csv)).toThrow();
  });
  it("keeps imported challenges unpublished by default and prevents overwrites", () => {
    const rows = parseImportCsv("id,company,title\na,Rodi,Demo");
    expect(importChallenges(rows, [])[0].published).toBe(false);
    expect(() => importChallenges(rows, ["a"])).toThrow();
    expect(() =>
      importChallenges([{ ...rows[0], published: "yes" }], []),
    ).toThrow();
    expect(() =>
      importChallenges(
        rows,
        Array.from({ length: 30 }, (_, i) => String(i)),
      ),
    ).toThrow();
  });
  it("validates mentor names, duplicates and existing account links", () => {
    expect(
      importMentors([{ name: "Mentor", user_id: "42" }], [], [42]),
    ).toEqual([{ name: "Mentor", user_id: 42 }]);
    expect(importMentors([{ name: "Mentor" }], [], [])).toEqual([
      { name: "Mentor" },
    ]);
    expect(() => importMentors([{ name: "Mentor" }], ["mentor"], [])).toThrow();
    expect(() =>
      importMentors([{ name: "Mentor", user_id: "43" }], [], [42]),
    ).toThrow();
    expect(() =>
      importMentors(
        [{ name: "Mentor", email: "ignored@example.test" }],
        [],
        [],
      ),
    ).toThrow();
  });
});
