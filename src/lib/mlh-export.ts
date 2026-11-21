import type { HackerProfile } from "./api";
import type { ParticipantExport } from "./participant-export";
import { toCsv } from "./csv";

export type MlhProfile = HackerProfile & {
  config?: {
    mlh_code_of_conduct?: boolean | null;
    recive_notifications?: boolean | null;
    comercial_notifications?: boolean | null;
  } | null;
};

const consentResponse = (value: boolean | null | undefined) =>
  value == null ? "" : value ? "Yes" : "No";

export function mlhCsv(
  participants: ParticipantExport["participants"],
  profiles: MlhProfile[],
) {
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );
  return toCsv([
    [
      "First name",
      "Last name",
      "Email",
      "Phone number",
      "Age",
      "Country of residence",
      "School",
      "Current level of study",
      "MLH Checkbox Responses",
      "MLH Code of Conduct",
      "Event Logistics Information",
      "Communication from MLH",
      "Receive notifications",
      "Receive commercial communications",
    ],
    ...participants.map((participant) => {
      const profile = profilesById.get(participant.id);
      const [firstName, ...lastName] = participant.name.trim().split(/\s+/);
      const consent = profile?.config?.mlh_code_of_conduct;
      const response = consentResponse(consent);
      return [
        firstName,
        lastName.join(" "),
        participant.email,
        profile?.telephone,
        participant.age_at_event,
        "",
        participant.study_center,
        participant.studies,
        response ? `MLH Code of Conduct: ${response}` : "",
        response,
        "",
        "",
        consentResponse(profile?.config?.recive_notifications),
        consentResponse(profile?.config?.comercial_notifications),
      ];
    }),
  ]);
}
