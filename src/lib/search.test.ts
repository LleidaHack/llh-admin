import { describe, expect, it } from "vitest";
import { searchIndex, searchItems } from "./search";
import { newestEvents } from "./events";
describe("directory search", () => {
  const users = [
    { name: "Júlia Solé", university: "Universitat de Lleida" },
    { name: "Joan", university: "UPC" },
  ];
  const index = searchIndex(users, (u) => `${u.name} ${u.university}`);
  it("matches accents, whitespace, case and words in any order", () => {
    expect(searchItems(index, "  LLEIDA   julia  ")).toEqual([users[0]]);
    expect(searchItems(index, "sole")).toEqual([users[0]]);
  });
  it("returns all records for an empty search and none for a missing match", () => {
    expect(searchItems(index, " ")).toEqual(users);
    expect(searchItems(index, "missing")).toEqual([]);
  });
});
it("sorts events newest first without mutating input and puts invalid dates last", () => {
  const events = [
    { id: 9, start_date: "2025-11-21" },
    { id: 1, start_date: "2026-11-21" },
    { id: 3, start_date: "invalid" },
  ];
  expect(newestEvents(events).map((e) => e.id)).toEqual([1, 9, 3]);
  expect(events[0].id).toBe(9);
});
