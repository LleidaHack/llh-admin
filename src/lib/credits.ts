import { toCsv } from "./csv";

export type CreditParticipant = {
  name: string | null;
  email: string | null;
  team_presented: boolean;
};

export function creditsCsv(participants: CreditParticipant[]) {
  return toCsv([
    ["Nom", "Correu", "Equip amb alguna presentació completada"],
    ...participants.map((p) => [
      p.name,
      p.email,
      p.team_presented ? "Sí" : "No",
    ]),
  ]);
}
