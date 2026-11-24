export type Guest = {
  id: number;
  name: string;
  email: string | null;
  active: boolean;
  ticket_sent_at: string | null;
  has_badge: boolean;
};

// Send (or, once delivered, resend) the "Convidat" ticket to a single guest.
export function guestTicketPath(eventId: number, guest: Guest) {
  return `/v1/event/${eventId}/tickets/send?audience=convidat&user_id=${guest.id}${guest.ticket_sent_at ? "&force=true" : ""}`;
}
