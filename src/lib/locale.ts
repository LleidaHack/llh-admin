import type { SyntheticEvent } from "react";

export const fieldNames: Record<string, string> = {
  name: "Nom",
  email: "Correu electrònic",
  password: "Contrasenya",
  nickname: "Àlies",
  location: "Ubicació",
  description: "Descripció",
  start_date: "Inici",
  end_date: "Fi",
  price: "Preu",
  max_participants: "Places",
  max_group_size: "Persones per equip",
  max_sponsors: "Màxim de patrocinadors",
  telephone: "Telèfon",
  address: "Adreça",
  website: "Web",
  tier: "Nivell",
  linkdin: "LinkedIn",
  code: "Codi",
  id: "Identificador",
};
export const accountType = (type: string) =>
  ({
    hacker: "Participant",
    lleida_hacker: "Organitzador",
    company: "Empresa",
    mentor: "Mentor",
    service: "Servei",
  })[type] || "Compte";
const messages: Record<string, string> = {
  "superadmin permission required":
    "Aquesta acció està reservada al superadmin.",
  "management access requires admin or superadmin":
    "Gestió està reservat als rols admin i superadmin.",
  "nice try, farmer. this tractor does not mint lleidacoins.":
    "Bon intent, pagès: aquest tractor no fabrica LleidaCoins. 🚜",
  "already registered in this round":
    "Ja has recollit aquest àpat o participat en aquesta activitat en aquesta ronda.",
  "meal already collected in this round":
    "Ja has recollit aquest àpat en aquesta ronda.",
  "meal round is closed": "Aquesta ronda està tancada.",
  "meal round changed; refresh before scanning again":
    "La ronda ha canviat. Actualitza abans de tornar a escanejar.",
  "insufficient lleidacoins": "No tens prou LleidaCoins per a aquest premi.",
  "prize out of stock": "Aquest premi està esgotat.",
  "participant must check in first":
    "Cal registrar primer l’entrada del participant.",
  "organizer permission required": "Necessites permisos d’organització.",
  "participant code not found":
    "No s’ha trobat cap participant amb aquest codi.",
  "badge is unassigned or belongs to another event":
    "L’acreditació no està assignada o pertany a un altre esdeveniment.",
  "configuration changed; refresh before saving":
    "La configuració ha canviat. Actualitza abans de desar.",
  "not enough time; extend judging hours or reduce slot length":
    "No hi caben totes les presentacions. Amplia l’horari o redueix-ne la durada.",
  "presentation changed; refresh first":
    "El torn ha canviat. Actualitza abans d’editar-lo.",
  "schedule conflict; adjust time or explicitly override":
    "Hi ha un solapament. Canvia l’hora o autoritza una excepció.",
  "room or team already has an active presentation":
    "La sala o l’equip ja té una presentació activa.",
  "web push is not configured":
    "Les notificacions push encara no estan configurades.",
  "movement already reversed": "Aquest moviment ja s’ha corregit.",
  "operation identifier already used for a different request":
    "Aquest identificador ja correspon a una altra operació.",
  "active meal delivery not found":
    "No s’ha trobat l’entrega o ja està corregida.",
  "incorrect password": "La contrasenya és incorrecta.",
  "account is not available":
    "Aquest compte no està disponible. Ha d'estar actiu i verificat.",
  "not authorized": "No tens permís per fer aquesta operació.",
  "user don'have permissions to do this":
    "No tens permís per fer aquesta operació.",
  "you don't have permissions to do this":
    "No tens permís per fer aquesta operació.",
  "invalid or expired token":
    "La sessió no és vàlida o ha caducat. Torna a entrar.",
  "invalid token": "La sessió no és vàlida. Torna a entrar.",
  "invalid token purpose":
    "Aquest identificador de sessió no permet fer aquesta operació.",
  "token expired": "La sessió ha caducat. Torna a entrar.",
  expired: "La sessió ha caducat. Torna a entrar.",
  "bearer credentials required": "Cal iniciar sessió per continuar.",
  "user not found": "No s'ha trobat el compte.",
  "hacker not found": "No s'ha trobat el participant.",
  "company user not found": "No s'ha trobat l'usuari de l'empresa.",
  "company not found": "No s'ha trobat l'empresa.",
  "event not found": "No s'ha trobat l'esdeveniment.",
  "meal not found": "No s'ha trobat l'àpat.",
  "hacker group not found": "No s'ha trobat l'equip.",
  "company is not sponsor": "Aquesta empresa no patrocina l'esdeveniment.",
  "event is full": "L'esdeveniment ja no té places disponibles.",
  "event full": "L'esdeveniment ja no té places disponibles.",
  "event registration not open":
    "Les inscripcions de l'esdeveniment estan tancades.",
  "event is already archived": "L'esdeveniment ja està arxivat.",
  "event is not archived": "L'esdeveniment no està arxivat.",
  "unable to operate with an archived event, unarchive it first":
    "Cal desarxivar l'esdeveniment abans de modificar-lo.",
  "unable to update an archived event, unarchive it first":
    "Cal desarxivar l'esdeveniment abans d'editar-lo.",
  "unable to delete an archived event, unarchive it first":
    "Cal desarxivar l'esdeveniment abans d'eliminar-lo.",
  "hacker already accepted":
    "Aquest participant ja està acceptat. Retira'n l'acceptació abans de rebutjar-lo.",
  "hacker already participating":
    "L'arribada d'aquest participant ja està registrada.",
  "hacker already registered": "Aquest participant ja està inscrit.",
  "hacker is not registered":
    "Aquest participant no està inscrit a l'esdeveniment.",
  "hacker not registered":
    "Aquest participant no està inscrit a l'esdeveniment.",
  "user not registered": "Aquest usuari no està inscrit a l'esdeveniment.",
  "hacker not accepted":
    "Cal acceptar el participant abans de registrar-ne l'arribada.",
  "user not accepted": "Aquest usuari encara no està acceptat.",
  "hacker not participating":
    "Aquest participant encara no ha registrat l'arribada.",
  "hacker is not participant": "Aquest usuari no participa en l'esdeveniment.",
  "hacker already banned": "Aquest participant ja té l'accés bloquejat.",
  "hacker already unbanned": "Aquest participant ja té l'accés desbloquejat.",
  "hacker already eating": "Aquest participant ja té l'àpat registrat.",
  "email verification required":
    "Cal verificar el correu electrònic abans d’iniciar sessió. Revisa la safata d’entrada i el correu brossa.",
  "user already verified": "Aquest compte ja està verificat.",
  "user already confirmed assistance":
    "Aquest usuari ja ha confirmat l'assistència.",
  "user not confirmed assitence":
    "Aquest usuari encara no ha confirmat l'assistència.",
  "you are not allowed to add meals": "No tens permís per crear àpats.",
  "you are not allowed to delete meals": "No tens permís per eliminar àpats.",
  "you are not allowed to update meals": "No tens permís per editar àpats.",
  "assign another company leader before transferring this user":
    "Assigna un altre responsable a l'empresa abans de transferir aquest usuari.",
};
function fallback(status: number) {
  if (status === 401) return "Cal tornar a iniciar sessió per continuar.";
  if (status === 403) return "No tens permís per fer aquesta operació.";
  if (status === 404) return "No s'ha trobat el recurs sol·licitat.";
  if (status === 409)
    return "L'operació entra en conflicte amb les dades actuals. Actualitza la pàgina.";
  if (status === 422 || status === 400)
    return "Revisa les dades introduïdes i torna-ho a provar.";
  if (status === 429)
    return "S'han fet massa peticions. Espera una estona i torna-ho a provar.";
  return `No s'ha pogut completar l'operació (codi ${status}). Torna-ho a provar.`;
}
export function serverError(detail: unknown, status: number): string {
  if (typeof detail === "string")
    return messages[detail.trim().toLowerCase()] || fallback(status);
  if (Array.isArray(detail) && detail.length)
    return detail
      .map((item) => {
        const e = item as { loc?: unknown; type?: string; msg?: string };
        const key = Array.isArray(e?.loc) ? String(e.loc.at(-1)) : "";
        const label = fieldNames[key] || "Camp";
        const type = e?.type;
        let message = "El valor no és vàlid.";
        if (type === "missing" || e?.msg === "Field required")
          message = "Aquest camp és obligatori.";
        else if (type === "int_parsing" || type === "int_type")
          message = "Introdueix un nombre enter.";
        else if (type?.startsWith("datetime") || type?.startsWith("date"))
          message = "Introdueix una data vàlida.";
        else if (type === "url_parsing" || type === "url_scheme")
          message = "Introdueix una adreça web vàlida.";
        return `${label}: ${message}`;
      })
      .join("; ");
  return fallback(status);
}
export function clearValidation(event: SyntheticEvent) {
  const field = event.target;
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  )
    field.setCustomValidity("");
}
export function catalanValidation(event: SyntheticEvent) {
  const field = event.target;
  if (!(
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ))
    return;
  field.setCustomValidity("");
  const v = field.validity;
  if (v.valueMissing) field.setCustomValidity("Aquest camp és obligatori.");
  else if (v.typeMismatch)
    field.setCustomValidity(
      field instanceof HTMLInputElement && field.type === "email"
        ? "Introdueix un correu electrònic vàlid."
        : "Introdueix una adreça web vàlida.",
    );
  else if (v.rangeUnderflow || v.rangeOverflow)
    field.setCustomValidity("El valor és fora del rang permès.");
  else if (v.stepMismatch || v.badInput)
    field.setCustomValidity("Introdueix un valor numèric vàlid.");
  else if (!v.valid) field.setCustomValidity("Revisa el valor d'aquest camp.");
}
