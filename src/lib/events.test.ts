import { describe, expect, it } from "vitest";
import { eventPayload } from "./events";
import type { EventRecord } from "./api";
function form(overrides: Record<string, string> = {}) {
  const f = new FormData();
  Object.entries({
    name: "HackEPS",
    location: "Lleida",
    description: "Test",
    start_date: "2026-11-21T09:00",
    end_date: "2026-11-22T18:00",
    price: "0",
    max_participants: "150",
    max_group_size: "4",
    max_sponsors: "10",
    ...overrides,
  }).forEach(([k, v]) => f.set(k, v));
  return f;
}
describe("event submission", () => {
  it("sends create fields without inventing an event ID", () => {
    expect(eventPayload(form())).toMatchObject({
      name: "HackEPS",
      price: 0,
      max_participants: 150,
      archived: false,
    });
    expect(eventPayload(form())).not.toHaveProperty("id");
  });
  it("does not unarchive an edited event", () => {
    expect(eventPayload(form(), { id: 1 } as EventRecord)).not.toHaveProperty(
      "archived",
    );
  });
  it("rejects reversed dates", () => {
    expect(() => eventPayload(form({ end_date: "2026-11-20T18:00" }))).toThrow(
      "posterior",
    );
  });
  it.each(["0", "-1", "1.5"])("rejects invalid team size %s", (size) => {
    expect(() => eventPayload(form({ max_group_size: size }))).toThrow();
  });
  it("preserves entered wall clock dates", () =>
    expect(eventPayload(form()).start_date).toBe("2026-11-21T09:00"));
});
