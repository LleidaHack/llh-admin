export type GuestKind = "convidat" | "empresa";

export type Guest = {
  id: number;
  name: string;
  email: string | null;
  kind?: GuestKind;
  active: boolean;
  ticket_sent_at: string | null;
  has_badge: boolean;
};

// Wording for each ticket kind; the role is what the ticket and Wallet show.
export const guestCopy: Record<
  GuestKind,
  {
    role: string;
    count: (n: number) => string;
    singular: string;
    emptyTitle: string;
    emptyHint: string;
    namePlaceholder: string;
    emailPlaceholder: string;
  }
> = {
  convidat: {
    role: "Convidat",
    count: (n) => `${n} ${n === 1 ? "convidat" : "convidats"}`,
    singular: "un convidat",
    emptyTitle: "Encara no hi ha convidats",
    emptyHint: "Afegeix el primer convidat amb el formulari.",
    namePlaceholder: "Nom i cognoms",
    emailPlaceholder: "convidat@example.com",
  },
  empresa: {
    role: "Empresa",
    count: (n) =>
      `${n} ${n === 1 ? "entrada d’empresa" : "entrades d’empresa"}`,
    singular: "una persona d’empresa",
    emptyTitle: "Encara no hi ha entrades d’empresa",
    emptyHint: "Afegeix la primera persona d’empresa amb el formulari.",
    namePlaceholder: "Nom i cognoms (i empresa)",
    emailPlaceholder: "nom@empresa.com",
  },
};

export function guestListPath(eventId: number, kind: GuestKind) {
  return `/v1/operations/${eventId}/guests?kind=${kind}`;
}

// Send (or, once delivered, resend) the ticket of that kind to a single person.
export function guestTicketPath(
  eventId: number,
  guest: Guest,
  kind: GuestKind = "convidat",
) {
  return `/v1/event/${eventId}/tickets/send?audience=${kind}&user_id=${guest.id}${guest.ticket_sent_at ? "&force=true" : ""}`;
}

// Turn a guest into a hacker account; they get a mail to set their password.
export function guestPromotePath(eventId: number, guest: Guest) {
  return `/v1/operations/${eventId}/guests/${guest.id}/promote`;
}
