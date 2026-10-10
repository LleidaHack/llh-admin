import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes cells and escapes quotes", () => {
    expect(toCsv([["a", 'b "c"', null, 3]])).toBe('"a","b ""c""","","3"');
  });
  it("neutralises formula injection", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "-2", "@x"]])).toBe(
      `"'=HYPERLINK(1)","'+1","'-2","'@x"`,
    );
  });
});
