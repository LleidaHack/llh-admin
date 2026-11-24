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

// Mails the official Discord link (Pàgina Live → Invitació de Discord) to the
// accepted and confirmed hackers. Staff, mentors and guests are excluded.
export function DiscordInviteCard({ id }: { id: number }) {
  const [status, setStatus] = useState<DiscordInviteStatus | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

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

  const progress = status?.progress;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Servidor oficial de Discord</CardTitle>
        <CardDescription>
          Envia l’enllaç oficial de Discord a tots els participants acceptats
          amb l’assistència confirmada. No s’envia al staff, als mentors, als
          convidats ni a les empreses.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ErrorBox error={error} />
        <p className="text-sm">
          Enllaç:{" "}
          {status?.discord_url ? (
            <a
              className="break-all underline"
              href={status.discord_url}
              target="_blank"
              rel="noreferrer"
            >
              {status.discord_url}
            </a>
          ) : (
            <span className="text-muted-foreground">
              {status
                ? "Encara no està configurat. Afegeix-lo a Pàgina Live → Invitació de Discord."
                : "Carregant…"}
            </span>
          )}
        </p>
        <Button
          className="self-start"
          variant="outline"
          disabled={
            !status?.discord_url || !status.recipients || status.running
          }
          onClick={() => setConfirming(true)}
        >
          <Send data-icon="inline-start" />
          Enviar el Discord als participants ({status?.recipients ?? "…"})
        </Button>
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
          title={`Enviar el Discord a ${status.recipients} participants`}
          description={`S’enviarà l’enllaç ${status.discord_url} a tots els participants acceptats i confirmats. Si ja l’havies enviat, el tornaran a rebre. Aquesta acció envia correus reals.`}
          onConfirm={async () => {
            await request(`/v1/event/${id}/discord-invite`, "POST");
            await load();
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </Card>
  );
}
