"use client";
import { useEffect, useRef, useState } from "react";
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
  canPublish,
  blocked = false,
  open,
  onChange,
}: {
  id: number;
  version: number;
  published: boolean;
  canPublish: boolean;
  // True while the configuration form has unsaved edits: publishing reloads
  // the configuration and would discard them.
  blocked?: boolean;
  open: boolean;
  onChange: () => Promise<void>;
}) {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const pollError = useRef("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      request<Results>(`/v1/operations/${id}/challenge-votes`)
        .then((r) => {
          if (!active) return;
          setResults(r);
          // Clear a previous polling error once polling recovers.
          setError((current) => (current === pollError.current ? "" : current));
        })
        .catch((e) => {
          if (!active) return;
          pollError.current = errorMessage(e);
          setError(pollError.current);
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
          Reptes reals {published ? "visibles" : "ocults"} · Elecció{" "}
          {open ? "oberta" : "tancada"}
        </p>
        <p className="text-sm text-muted-foreground">
          Abans de publicar, el Live només mostra els reptes esquer marcats com
          a publicats. Els reals i els seus recursos queden reservats a Gestió.
          Només un superadmin pot revelar-los. Desa els canvis abans de
          publicar; només es revelen els reptes reals marcats com a publicats.
          Els esquers no es poden votar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy || blocked || !canPublish}
            variant={published ? "outline" : "default"}
            onClick={() => void update(!published, false)}
          >
            {published ? "Ocultar reptes" : "Publicar reptes"}
          </Button>
          <Button
            disabled={busy || blocked || !published}
            variant={open ? "outline" : "default"}
            onClick={() => void update(published, !open)}
          >
            {open ? "Tancar elecció de repte" : "Obrir elecció de repte"}
          </Button>
        </div>
        {blocked && (
          <p role="status" className="text-sm">
            Desa o descarta els canvis de configuració abans de publicar o obrir
            l’elecció.
          </p>
        )}
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
