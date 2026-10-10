import { dateTimeLabel } from "@/lib/events";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyBox, ErrorBox, Loading } from "@/components/shared";
import {
  request,
  errorMessage,
  type AuditEntry,
  type Participant,
} from "@/lib/api";
import { useUserNames } from "./use-user-names";

const ACTIONS: Record<string, string> = {
  accept: "Ha acceptat",
  unaccept: "Ha retirat l'acceptació de",
  reject: "Ha rebutjat",
};

export function AuditLogTab({
  eventId,
  participants,
  version,
}: {
  eventId: number;
  participants: Participant[];
  version: number;
}) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState("");
  const names = useUserNames(entries?.map((e) => e.actor_id) ?? []);
  const load = useCallback(async () => {
    try {
      setEntries(await request<AuditEntry[]>(`/v1/event/${eventId}/audit`));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [eventId]);
  useEffect(() => {
    void load();
  }, [load, version]);
  const participantName = (id: number | null) =>
    participants.find((p) => p.id === id)?.name ?? (id ? `#${id}` : "—");
  const action = (entry: AuditEntry) => {
    const group = /^(accept|reject)_group:(\d+)$/.exec(entry.action);
    if (group)
      return `${group[1] === "accept" ? "Ha acceptat" : "Ha rebutjat"} l'equip #${group[2]}`;
    return `${ACTIONS[entry.action] ?? entry.action} ${participantName(entry.target_id)}`;
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="page-heading">
        <div>
          <h2>Historial</h2>
          <p className="text-sm text-muted-foreground">
            Qui ha acceptat o rebutjat cada inscripció, i quan.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          aria-label="Actualitzar l'historial"
        >
          <RefreshCw />
        </Button>
      </div>
      <ErrorBox error={error} />
      {entries === null ? (
        !error && <Loading />
      ) : entries.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Organitzador</TableHead>
              <TableHead>Acció</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{dateTimeLabel(entry.created_at)}</TableCell>
                <TableCell>
                  {entry.actor_id != null
                    ? names[entry.actor_id] || `Usuari ${entry.actor_id}`
                    : "Servei"}
                </TableCell>
                <TableCell>{action(entry)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyBox title="Encara no hi ha canvis registrats">
          Les acceptacions i els rebutjos apareixeran aquí.
        </EmptyBox>
      )}
    </div>
  );
}
