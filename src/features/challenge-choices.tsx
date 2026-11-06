"use client";
import { useEffect, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Results = {
  total_teams: number;
  voted: number;
  teams: { group_id: number; team: string; challenge: string | null }[];
  challenges: { id: string; title: string; count: number }[];
};
export function ChallengeChoices({
  id,
  version,
  published,
  open,
  onChange,
}: {
  id: number;
  version: number;
  published: boolean;
  open: boolean;
  onChange: () => Promise<void>;
}) {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      request<Results>(`/v1/operations/${id}/challenge-votes`)
        .then((r) => {
          if (active) setResults(r);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, version]);
  async function update(released: boolean, voting: boolean) {
    setBusy(true);
    setError("");
    try {
      await request(`/v1/operations/${id}/challenge-controls`, "PUT", {
        version,
        challenges_released: released,
        challenge_votes_open: voting,
        reason:
          released !== published
            ? released
              ? "Publish challenges from management"
              : "Hide challenges and close team choices"
            : voting
              ? "Open preliminary team challenge choices"
              : "Close preliminary team challenge choices",
      });
      await onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publicació i elecció dels equips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          Reptes {published ? "visibles" : "ocults"} · Elecció{" "}
          {open ? "oberta" : "tancada"}
        </p>
        <p className="text-sm text-muted-foreground">
          Desa els reptes abans de publicar-los. Només es mostren els marcats
          com a publicats. Una elecció orientativa per equip, modificable mentre
          estigui oberta; no crea entregues ni torns del jurat.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            variant={published ? "outline" : "default"}
            onClick={() => void update(!published, false)}
          >
            {published ? "Ocultar reptes" : "Publicar reptes"}
          </Button>
          <Button
            disabled={busy || !published}
            variant={open ? "outline" : "default"}
            onClick={() => void update(published, !open)}
          >
            {open ? "Tancar elecció de repte" : "Obrir elecció de repte"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {results && (
          <>
            <p className="text-sm">
              {results.voted} de {results.total_teams} equips han escollit
              repte.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {results.challenges.map((c) => (
                <div key={c.id} className="rounded border p-3">
                  <strong>{c.count}</strong> · {c.title}
                </div>
              ))}
            </div>
            <details>
              <summary className="cursor-pointer text-sm">
                Veure elecció de cada equip
              </summary>
              <div className="mt-3 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">Equip</th>
                      <th className="p-2">Repte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.teams.map((t) => (
                      <tr key={t.group_id} className="border-t">
                        <td className="p-2">{t.team}</td>
                        <td className="p-2">
                          {results.challenges.find((c) => c.id === t.challenge)
                            ?.title ||
                            t.challenge ||
                            "Pendent"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
