import { expect, it } from "vitest";
import { needsReleaseReminder } from "./release-reminder";
import type { Participant } from "./api";

const participant: Participant = {
  id: 1,
  name: "Laia",
  email: "laia@example.test",
  nickname: "laia",
  status: "accepted",
  confirmed_assistance: true,
};
it("targets only confirmed accepted places that have not received the reminder", () => {
  expect(needsReleaseReminder(participant)).toBe(true);
  for (const changes of [
    { status: "pending" },
    { status: "rejected" },
    { status: "cancelled" },
    { confirmed_assistance: false },
    { confirmed_assistance: undefined },
    { release_reminder_sent_at: "2026-11-15T10:00:00" },
  ])
    expect(needsReleaseReminder({ ...participant, ...changes })).toBe(false);
});
