"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Status = {
  server_time: string;
  version: number;
  phase: string;
  attendance: { expected: number; checked_in: number; pending: number };
  dietary: { restriction: string; count: number }[];
  meals: { id: number; name: string; served: number }[];
  rooms: {
    id: string;
    title: string;
    paused: boolean;
    presentations: {
      id: number;
      team: string;
      state: string;
      started_at: string | null;
    }[];
  }[];
  incidents: {
    id: number;
    title: string;
    details: string;
    status: string;
    version: number;
  }[];
  recent_rejections: { id: number; action: string; created_at: string }[];
};
export function EventCommandCenter({ id }: { id: number }) {
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const attempt = useRef<{ key: string; id: string } | null>(null);
  const base = `/v1/operations/${id}`;
  const load = useCallback(
    async () => setData(await request<Status>(`/v1/operations/${id}/status`)),
    [id],
  );
  useEffect(() => {
    let active = true,
      running = false;
    const poll = async () => {
      if (document.hidden || running) return;
      running = true;
      try {
        const next = await request<Status>(`/v1/operations/${id}/status`);
        if (active) {
          setData(next);
          setPollError("");
        }
      } catch (e) {
        if (active) setPollError(errorMessage(e));
      } finally {
        running = false;
      }
    };
    void poll();
    const timer = setInterval(poll, 15000);
    window.addEventListener("focus", poll);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [id]);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span />
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void run(load)}
        >
          Actualitzar
        </Button>
      </div>
      {(error || pollError) && (
        <p role="alert" className="text-destructive">
          {error || pollError} Les dades anteriors poden estar desactualitzades.
        </p>
      )}
      {!data ? (
        <p>Carregant l’estat…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Actualitzat: {new Date(data.server_time).toLocaleTimeString("ca")} ·
            Refresc cada 15 segons
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Assistents previstos", data.attendance.expected],
              ["Check-ins fets", data.attendance.checked_in],
              ["Pendents d’arribar", data.attendance.pending],
            ].map(([label, count]) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">
                  {count}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Àpats servits</CardTitle>
              </CardHeader>
              <CardContent>
                {data.meals.length ? (
                  data.meals.map((m) => (
                    <p key={m.id}>
                      {m.name}: <strong>{m.served}</strong>
                    </p>
                  ))
                ) : (
                  <p>No hi ha àpats configurats.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Previsió de restriccions alimentàries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm">
                  Només participants acceptats i confirmats. Les respostes es
                  mostren tal com s’han declarat.
                </p>
                {data.dietary.length ? (
                  data.dietary.map((d) => (
                    <p key={d.restriction}>
                      {d.restriction}: <strong>{d.count}</strong>
                    </p>
                  ))
                ) : (
                  <p>Cap restricció declarada.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <h3 className="text-lg font-semibold">Sales i presentacions</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data.rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle>
                    {room.title} · {room.paused ? "En pausa" : "Oberta"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {room.presentations.length ? (
                    room.presentations.map((p) => (
                      <p key={p.id}>
                        <strong>{p.team}</strong> ·{" "}
                        {p.state === "called"
                          ? "Avisat per preparar-se"
                          : p.started_at
                            ? "Presentant"
                            : "A la sala, pendent d’iniciar"}
                      </p>
                    ))
                  ) : (
                    <p>Sense equips actius.</p>
                  )}
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => {
                      const reason = prompt(
                        room.paused
                          ? "Motiu per reprendre la sala:"
                          : "Motiu de la pausa (la presentació actual no es finalitza):",
                      );
                      if (!reason || reason.trim().length < 3) return;
                      void run(() =>
                        request(
                          `${base}/rooms/${encodeURIComponent(room.id)}/pause`,
                          "POST",
                          {
                            version: data.version,
                            paused: !room.paused,
                            reason,
                          },
                        ),
                      );
                    }}
                  >
                    {room.paused ? "Reprendre sala" : "Pausar sala"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Incidències de l’organització</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const key = JSON.stringify([id, title, details]);
                  if (attempt.current?.key !== key)
                    attempt.current = { key, id: crypto.randomUUID() };
                  void run(async () => {
                    await request(`${base}/incidents`, "POST", {
                      title,
                      details,
                      operation_id: attempt.current!.id,
                    });
                    attempt.current = null;
                    setTitle("");
                    setDetails("");
                  });
                }}
              >
                <Input
                  aria-label="Títol de la incidència"
                  placeholder="Què ha passat?"
                  required
                  minLength={3}
                  maxLength={150}
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  aria-label="Detalls de la incidència"
                  placeholder="Detalls per a la resta de l’organització"
                  maxLength={2000}
                  value={details}
                  disabled={busy}
                  onChange={(e) => setDetails(e.target.value)}
                />
                <Button disabled={busy}>Registrar incidència</Button>
              </form>
              {data.incidents.map((i) => (
                <div key={i.id} className="space-y-2 border-t pt-3">
                  <strong>
                    {i.title} · {i.status === "resolved" ? "Resolta" : "Oberta"}
                  </strong>
                  <p className="whitespace-pre-wrap">{i.details}</p>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        request(`${base}/incidents/${i.id}`, "PATCH", {
                          version: i.version,
                          status: i.status === "resolved" ? "open" : "resolved",
                        }),
                      )
                    }
                  >
                    {i.status === "resolved" ? "Reobrir" : "Marcar resolta"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <details>
            <summary>
              Últimes operacions rebutjades ({data.recent_rejections.length})
            </summary>
            <p className="text-sm">
              Poden ser escanejos duplicats o operacions no permeses. Consulta
              Traçabilitat per veure’n el detall.
            </p>
            {data.recent_rejections.map((a) => (
              <p key={a.id}>
                #{a.id} · {a.action} ·{" "}
                {new Date(a.created_at).toLocaleString("ca")}
              </p>
            ))}
          </details>
        </>
      )}
    </div>
  );
}
