import type { HackerProfile, Participant } from "./api";
import { toCsv } from "./csv";

export type ParticipantExport = {
  meals: { id: number; name: string }[];
  participants: (Participant &
    HackerProfile & {
      checked_in: boolean;
      teams: string[];
      eaten_meal_ids: number[];
      wants_credit: boolean | null;
      ticket_sent_at: string | null;
      cancelled_at: string | null;
    })[];
};
const statuses: Record<string, string> = {
  accepted: "Acceptat",
  pending: "Pendent",
  rejected: "Rebutjat",
  cancelled: "Plaça cancel·lada",
};
const yesNo = (value: boolean | null | undefined) =>
  value == null ? "Desconegut" : value ? "Sí" : "No";

export function participantsCsv({ participants, meals }: ParticipantExport) {
  return toCsv([
    [
      "ID",
      "Nom",
      "Àlies",
      "Correu",
      "Estat",
      "Assistència confirmada",
      "Check-in fet",
      "Equips",
      "Ha menjat algun àpat",
      "Àpats diferents consumits",
      ...meals.map((meal) => `Àpat: ${meal.name} (#${meal.id})`),
      "Data d'inscripció",
      "Data de cancel·lació",
      "Entrada enviada",
      "Recordatori d’alliberar plaça enviat",
      "Centre d'estudis",
      "Estudis",
      "Ubicació",
      "Restriccions alimentàries",
      "Talla de samarreta",
      "Crèdits ECTS sol·licitats",
      "Edat a l’inici de l’esdeveniment",
      "Menor",
      "CV disponible",
      "LleidaCoins",
      "Nombre de notes",
      "Descripció",
      "GitHub",
      "LinkedIn",
      "Com ens has conegut",
    ],
    ...participants.map((p) => {
      const eaten = new Set(p.eaten_meal_ids);
      const count = meals.filter((meal) => eaten.has(meal.id)).length;
      return [
        p.id,
        p.name,
        p.nickname,
        p.email,
        statuses[p.status] ?? p.status,
        p.status === "accepted" ? yesNo(p.confirmed_assistance) : "No aplica",
        yesNo(p.checked_in),
        p.teams.join("; "),
        yesNo(count > 0),
        count,
        ...meals.map((meal) => yesNo(eaten.has(meal.id))),
        p.registered_at,
        p.cancelled_at,
        p.ticket_sent_at,
        p.release_reminder_sent_at,
        p.study_center,
        p.studies,
        p.location,
        p.food_restrictions,
        p.shirt_size,
        yesNo(p.wants_credit),
        p.age_at_event,
        yesNo(p.is_minor),
        yesNo(p.has_cv),
        p.lleidacoins,
        p.notes_count,
        p.description,
        p.github,
        p.linkedin,
        p.how_did_you_meet_us,
      ];
    }),
  ]);
}
