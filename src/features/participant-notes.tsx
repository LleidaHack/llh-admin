import { dateTimeLabel } from "@/lib/events";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBox, Loading } from "@/components/shared";
import { request, errorMessage, type ParticipantNote } from "@/lib/api";
import { useUserNames } from "./use-user-names";

// Organizer-only notes about one registration; hackers never see them.
export function ParticipantNotes({
  eventId,
  hackerId,
  onChange,
}: {
  eventId: number;
  hackerId: number;
  onChange?: () => void;
}) {
  const [notes, setNotes] = useState<ParticipantNote[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const names = useUserNames(notes?.map((n) => n.author_id) ?? []);
  const load = useCallback(async () => {
    try {
      setNotes(
        await request<ParticipantNote[]>(
          `/v1/event/${eventId}/notes/${hackerId}`,
        ),
      );
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [eventId, hackerId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    try {
      await task();
      await load();
      onChange?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex flex-col gap-3 border-t pt-5">
      <h2>Notes internes</h2>
      <p className="text-sm text-muted-foreground">
        Només les veu l&apos;organització.
      </p>
      <ErrorBox error={error} />
      {notes === null && !error && <Loading />}
      {notes?.length === 0 && (
        <p className="text-sm text-muted-foreground">Encara no hi ha notes.</p>
      )}
      {notes?.map((note) => (
        <div key={note.id} className="flex gap-3 rounded border p-3">
          <div className="flex-1">
            <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
              {note.body}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {note.author_id != null
                ? names[note.author_id] || `Usuari ${note.author_id}`
                : "Servei"}{" "}
              · {dateTimeLabel(note.created_at)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Esborrar la nota"
            disabled={busy}
            onClick={() =>
              void run(() =>
                request(`/v1/event/${eventId}/notes/item/${note.id}`, "DELETE"),
              )
            }
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          void run(async () => {
            await request(`/v1/event/${eventId}/notes/${hackerId}`, "POST", {
              body,
            });
            setDraft("");
          });
        }}
      >
        <Textarea
          aria-label="Nova nota"
          placeholder="Afegeix una nota…"
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          type="submit"
          className="self-start"
          disabled={busy || !draft.trim()}
        >
          Afegir nota
        </Button>
      </form>
    </section>
  );
}
