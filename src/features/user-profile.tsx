import { useEffect, useState } from "react";
import Link from "next/link";
import {
  request,
  errorMessage,
  fetchCvUrl,
  type HackerProfile,
  type EventRecord,
} from "@/lib/api";
import { newestEvents, dateLabel } from "@/lib/events";
import { ErrorBox, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";

export type UserProfile = HackerProfile & {
  id?: number;
  name: string;
  nickname: string;
  type: string;
  is_verified?: boolean;
  code?: string;
  image?: string | null;
  birthdate?: string;
  address?: string;
  created_at?: string;
  banned?: boolean | number;
};
const fields: { key: keyof UserProfile; label: string; link?: boolean }[] = [
  { key: "telephone", label: "Telèfon" },
  { key: "birthdate", label: "Data de naixement" },
  { key: "address", label: "Adreça" },
  { key: "created_at", label: "Data d'alta" },
  { key: "studies", label: "Estudis" },
  { key: "study_center", label: "Universitat / centre d'estudis" },
  { key: "location", label: "Ubicació" },
  { key: "github", label: "GitHub", link: true },
  { key: "linkedin", label: "LinkedIn", link: true },
  { key: "description", label: "Experiència" },
  { key: "food_restrictions", label: "Restriccions alimentàries" },
  { key: "shirt_size", label: "Talla de samarreta" },
  { key: "how_did_you_meet_us", label: "Com ens va conèixer" },
];
export function UserProfileDetails({ user }: { user: UserProfile }) {
  const [profile, setProfile] = useState<UserProfile>(user);
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [loading, setLoading] = useState(
    user.type === "hacker" && user.id != null,
  );
  const [error, setError] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [cvBusy, setCvBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (user.type !== "hacker" || user.id == null) {
      return;
    }
    void Promise.allSettled([
      request<HackerProfile>(`/v1/hacker/${user.id}`),
      request<EventRecord[]>(`/v1/hacker/${user.id}/events`),
    ]).then(([details, history]) => {
      if (!active) return;
      if (details.status === "fulfilled")
        setProfile({ ...user, ...details.value });
      if (history.status === "fulfilled")
        setEvents(newestEvents(history.value));
      setError(
        [details, history]
          .flatMap((r) =>
            r.status === "rejected" ? [errorMessage(r.reason)] : [],
          )
          .join(" "),
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    if (!cvUrl) return;
    return () => URL.revokeObjectURL(cvUrl);
  }, [cvUrl]);
  // Cleanup also covers closing the profile while its PDF is still loading.
  useEffect(() => {
    if (!cvBusy || user.id == null) return;
    let active = true;
    void fetchCvUrl(user.id)
      .then((url) => {
        if (active) setCvUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setCvBusy(false);
      });
    return () => {
      active = false;
    };
  }, [cvBusy, user.id]);
  return (
    <div className="flex flex-col gap-5">
      <ErrorBox error={error} />
      {loading && <Loading />}
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, link }) => {
          const value = profile[key];
          if (value == null || String(value).trim() === "") return null;
          const text = String(value);
          return (
            <div key={key}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="break-words whitespace-pre-wrap text-sm">
                {link && /^https?:\/\//i.test(text) ? (
                  <a
                    className="underline"
                    href={text}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {text}
                  </a>
                ) : (
                  text
                )}
              </dd>
            </div>
          );
        })}
        {profile.banned != null && (
          <div>
            <dt className="text-sm text-muted-foreground">Accés</dt>
            <dd>{profile.banned ? "Bloquejat" : "Actiu"}</dd>
          </div>
        )}
      </dl>
      {profile.cv?.trim() && (
        <Button
          variant="outline"
          className="self-start"
          disabled={cvBusy}
          onClick={() => setCvBusy(true)}
        >
          {cvBusy ? "Carregant CV…" : "Veure el CV"}
        </Button>
      )}
      {cvUrl && (
        <iframe
          src={cvUrl}
          title={`CV de ${user.name}`}
          className="h-[60vh] w-full rounded border"
        />
      )}
      {user.type === "hacker" && (
        <section className="flex flex-col gap-3">
          <h2>Esdeveniments en què ha participat</h2>
          {events?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No consta cap participació.
            </p>
          )}
          {events?.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="rounded border p-3 hover:bg-muted"
            >
              <span className="font-medium">{event.name}</span>
              <p className="text-sm text-muted-foreground">
                {dateLabel(event.start_date)} · {event.location}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
