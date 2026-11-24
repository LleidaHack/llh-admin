import { describe, expect, it } from "vitest";
import { guestTicketPath, type Guest } from "./guests";

const guest: Guest = {
  id: 7,
  name: "Convidada",
  email: "convidada@example.com",
  active: true,
  ticket_sent_at: null,
  has_badge: false,
};

describe("guestTicketPath", () => {
  it("sends a first ticket only to that guest", () => {
    expect(guestTicketPath(3, guest)).toBe(
      "/v1/event/3/tickets/send?audience=convidat&user_id=7",
    );
  });
  it("forces a resend once the ticket was delivered", () => {
    expect(
      guestTicketPath(3, { ...guest, ticket_sent_at: "2026-11-24T10:00:00" }),
    ).toBe("/v1/event/3/tickets/send?audience=convidat&user_id=7&force=true");
  });
});
