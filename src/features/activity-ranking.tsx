import { useEffect, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import { downloadCsv, toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Ranking = {
  activity: string;
  participants: {
    rank: number;
    user_id: number;
    name: string | null;
    best_duration_ms: number;
    attempts: number;
  }[];
};
const seconds = (ms: number) =>
  (ms / 1000).toLocaleString("ca", { maximumFractionDigits: 3 });

export function ActivityRanking({
  eventId,
  activities,
}: {
  eventId: number;
  activities: { id: string; title: string; timed?: boolean }[];
}) {
  const timed = activities.filter((a) => a.timed);
  const [selected, setSelected] = useState("");
  const activity = timed.some((a) => a.id === selected)
    ? selected
    : timed[0]?.id || "";
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: Ranking;
    error?: string;
  } | null>(null);
  const key = `${eventId}:${activity}:${revision}`;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    if (!activity) return;
    let active = true;
    request<Ranking>(
      `/v1/operations/${eventId}/activities/${encodeURIComponent(activity)}/ranking`,
    )
      .then((data) => {
        if (active) setResult({ key, data });
      })
      .catch((error) => {
        if (active) setResult({ key, error: errorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [eventId, activity, key]);
  if (!timed.length) return null;
  const data = current?.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rànquing intern d’activitats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Compta el millor intent de cada participant; més temps és millor. Els
          empats comparteixen posició. Les LleidaCoins dels guanyadors
          s’atorguen manualment des de l’escàner amb «Atorgar punts»
          (superadmin).
        </p>
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            aria-label="Activitat del rànquing"
            value={activity}
            onChange={(e) => setSelected(e.target.value)}
          >
            {timed.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant="outline"
            onClick={() => setRevision((v) => v + 1)}
            disabled={!current}
          >
            Actualitzar rànquing
          </Button>
          <Button
            variant="outline"
            disabled={!data}
            onClick={() =>
              data &&
              downloadCsv(
                `ranking-activitat-${eventId}.csv`,
                toCsv([
                  [
                    "Posició",
                    "Nom",
                    "ID participant",
                    "Millor temps (segons)",
                    "Intents",
                  ],
                  ...data.participants.map((p) => [
                    p.rank,
                    p.name,
                    p.user_id,
                    p.best_duration_ms / 1000,
                    p.attempts,
                  ]),
                ]),
              )
            }
          >
            Descarregar CSV
          </Button>
        </div>
        {!current && <p role="status">Carregant rànquing…</p>}
        {current?.error && <p role="alert">{current.error}</p>}
        {data &&
          (data.participants.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posició</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Millor temps</TableHead>
                  <TableHead>Intents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.participants.map((p) => (
                  <TableRow key={p.user_id}>
                    <TableCell>{p.rank}</TableCell>
                    <TableCell>
                      {p.name || `Participant ${p.user_id}`}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {seconds(p.best_duration_ms)} s
                    </TableCell>
                    <TableCell>{p.attempts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>Encara no hi ha intents registrats en aquesta activitat.</p>
          ))}
      </CardContent>
    </Card>
  );
}
