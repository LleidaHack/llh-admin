import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog, ErrorBox } from "@/components/shared";
import { errorMessage, request, type DiscordInviteStatus } from "@/lib/api";

type Audience = "hacker" | "mentor";

const AUDIENCES: Record<
  Audience,
  { title: string; who: string; field: string; button: string }
> = {
  hacker: {
    title: "Participants",
    who: "participants acceptats amb l’assistència confirmada",
    field: "Invitació de Discord",
    button: "Enviar als participants",
  },
  mentor: {
    title: "Mentors",
    who: "mentors actius",
    field: "Invitació de Discord per a mentors",
    button: "Enviar als mentors",
  },
};

// Mails the Discord invitation configured in Pàgina Live: the public link to
// confirmed hackers and a private link (it grants the mentor role) to active
// mentors. Staff and guests are never included.
export function DiscordInviteCard({ id }: { id: number }) {
  const [status, setStatus] = useState<DiscordInviteStatus | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<Audience | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(
        await request<DiscordInviteStatus>(`/v1/event/${id}/discord-invite`),
      );
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!status?.running) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [status?.running, load]);

  const linkOf = (audience: Audience) =>
    audience === "hacker"
      ? status?.discord_url
      : (status?.mentor_discord_url ?? null);
  const countOf = (audience: Audience) =>
    audience === "hacker" ? status?.recipients : status?.mentor_recipients;
  const progress = status?.progress;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servidor oficial de Discord</CardTitle>
        <CardDescription>
          Envia l’enllaç de Discord als participants confirmats i, amb un enllaç
          privat que dona el rol de mentor, als mentors actius. No s’envia al
          staff, als convidats ni a les empreses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorBox error={error} />
        {(Object.keys(AUDIENCES) as Audience[]).map((audience) => {
          const info = AUDIENCES[audience];
          const link = linkOf(audience);
          return (
            <div key={audience} className="flex flex-col gap-2">
              <p className="text-sm font-medium">{info.title}</p>
              <p className="text-sm">
                Enllaç:{" "}
                {link ? (
                  <a
                    className="break-all underline"
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link}
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    {status
                      ? `Encara no està configurat. Afegeix-lo a Pàgina Live → ${info.field}.`
                      : "Carregant…"}
                  </span>
                )}
              </p>
              <Button
                className="self-start"
                variant="outline"
                disabled={!link || !countOf(audience) || status?.running}
                onClick={() => setConfirming(audience)}
              >
                <Send data-icon="inline-start" />
                {info.button} ({countOf(audience) ?? "…"})
              </Button>
            </div>
          );
        })}
        {progress && (progress.total ?? 0) > 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            {status?.running ? "Enviant" : "Últim enviament"}:{" "}
            {progress.sent ?? 0} de {progress.total} correus
            {progress.failed ? ` · ${progress.failed} errors` : ""}.
          </p>
        )}
      </CardContent>
      {confirming && status && (
        <ConfirmDialog
          title={`${AUDIENCES[confirming].button} (${countOf(confirming)})`}
          description={`S’enviarà l’enllaç ${linkOf(confirming)} als ${AUDIENCES[confirming].who}. Si ja l’havies enviat, el tornaran a rebre. Aquesta acció envia correus reals.`}
          onConfirm={async () => {
            await request(
              `/v1/event/${id}/discord-invite?audience=${confirming}`,
              "POST",
            );
            await load();
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </Card>
  );
}
