import type { HackerProfile } from "./api";
import type { ParticipantExport } from "./participant-export";
import { toCsv } from "./csv";

export type MlhProfile = HackerProfile & {
  config?: { mlh_code_of_conduct?: boolean | null } | null;
};

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
    ],
    ...participants.map((participant) => {
      const profile = profilesById.get(participant.id);
      const [firstName, ...lastName] = participant.name.trim().split(/\s+/);
      const consent = profile?.config?.mlh_code_of_conduct;
      const response = consent == null ? "" : consent ? "Yes" : "No";
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
      ];
    }),
  ]);
}
