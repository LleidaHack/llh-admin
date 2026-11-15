import type { Participant } from "./api";

export function needsReleaseReminder(p: Participant): boolean {
  return (
    p.status === "accepted" &&
    p.confirmed_assistance === true &&
    !p.release_reminder_sent_at
  );
}
