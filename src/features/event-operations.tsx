"use client";

import { useCallback, useEffect, useState } from "react";
import { ChallengeChoices } from "./challenge-choices";
import { DevpostImport } from "./devpost-import";
import { request, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Item = Record<string, any>;
const labels: Record<string, string> = {
  title: "Títol",
  description: "Descripció",
  id: "Identificador",
  start: "Inici",
  end: "Final",
  location: "Ubicació",
  points: "LleidaCoins",
  question: "Pregunta",
  answer: "Resposta",
  cost: "Cost",
  stock: "Unitats disponibles",
  published: "Publicat",
  paused: "En pausa",
  url: "Enllaç",
};
const templates: Record<string, Item> = {
  challenges: {
    id: "",
    title: "",
    description: "",
    published: false,
    resources: [],
  },
  decoy_challenges: {
    id: "",
    title: "",
    description: "",
    published: false,
    resources: [],
  },
  activities: {
    id: "",
    title: "",
    start: "",
    end: "",
    location: "",
    points: 0,
    published: true,
  },
  faqs: { question: "", answer: "" },
  prizes: { id: "", title: "", cost: 10, stock: 10 },
  rooms: { id: "", title: "", paused: false },
};
const sections: Record<string, string> = {
  challenges: "Reptes reals i recursos",
  decoy_challenges: "Reptes esquer · abans de la publicació",
  activities: "Agenda i activitats",
  faqs: "Preguntes freqüents",
  prizes: "Premis",
  rooms: "Sales del jurat",
};
function localDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export type OperationSection =
  | "live"
  | "activities"
  | "challenges"
  | "prizes"
  | "rooms"
  | "meals"
  | "coins"
  | "judging"
  | "devpost"
  | "alerts"
  | "audit"
  | "roles";
const sectionTitles: Record<OperationSection, string> = {
  live: "Pàgina Live",
  activities: "Agenda i activitats",
  challenges: "Reptes i recursos",
  prizes: "Premis",
  rooms: "Sales i horaris del jurat",
  meals: "Rondes dels àpats",
  coins: "LleidaCoins",
  judging: "Torns de presentació",
  devpost: "Projectes de Devpost",
  alerts: "Avisos",
  audit: "Traçabilitat",
  roles: "Rols i permisos",
};
export function EventOperations({
  id,
  section,
}: {
  id: number;
  section: OperationSection;
}) {
  const [data, setData] = useState<Item | null>(null),
    [draft, setDraft] = useState<Item | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState<Item[]>([]);
  const tab = section;
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<Item[]>([]),
    [historyAction, setHistoryAction] = useState("");
  const [scan, setScan] = useState({
    kind: "award",
    code: "",
    target: "",
    amount: 10,
    reason: "",
    round: 1,
  });
  const [alert, setAlert] = useState({
    title: "",
    message: "",
    level: "info",
    push: false,
    live: true,
    discord: false,
    category: "general",
  });
  const [discord, setDiscord] = useState<{
    configured: boolean;
    deliveries: Item[];
  } | null>(null);
  const [alertMinutes, setAlertMinutes] = useState(60);
  const [enroll, setEnroll] = useState({
    group: "",
    challenge: "",
    mlh: false,
  });
  const load = useCallback(async () => {
    const result = await request<Item>(`/v1/operations/${id}/manage`);
    setData(result);
    if (result.access_role !== "superadmin")
      setScan((s) =>
        ["award", "reverse", "void_scan"].includes(s.kind)
          ? { ...s, kind: "redeem" }
          : s,
      );
    setDraft(structuredClone(result));
  }, [id]);
  useEffect(() => {
    load().catch((e) => setError(errorMessage(e)));
  }, [load]);
  useEffect(() => {
    if (tab !== "alerts") return;
    let active = true;
    const refresh = () =>
      request<{ configured: boolean; deliveries: Item[] }>(
        `/v1/operations/${id}/discord-deliveries`,
      )
        .then((result) => {
          if (active) setDiscord(result);
        })
        .catch(() => {});
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, tab]);
  async function run(fn: () => Promise<unknown>, message = "Canvi desat") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      setNotice(message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const base = `/v1/operations/${id}`;
  const update = (key: string, value: any) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const updateItem = (key: string, index: number, field: string, value: any) =>
    update(
      key,
      draft![key].map((item: Item, i: number) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  async function historyPage(append = false) {
    try {
      const last = append ? history.at(-1)?.id : undefined;
      const result = await request<Item[]>(
        `${base}/audit?${new URLSearchParams({ ...(last ? { before: String(last) } : {}), ...(historyAction ? { action: historyAction } : {}) })}`,
      );
      setHistory(append ? [...history, ...result] : result);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    if (section === "audit") void historyPage();
    if (section === "roles")
      void request<Item[]>(base + "/staff")
        .then(setStaff)
        .catch((e) => setError(errorMessage(e)));
    // Each event section mounts independently; history filters refresh explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, section]);
  if (!data || !draft)
    return <p role="status">{error || "Carregant operacions…"}</p>;
  return (
    <div className="event-operations space-y-5">
      <h2 className="text-xl font-bold">{sectionTitles[section]}</h2>
      {section === "challenges" && (
        <ChallengeChoices
          id={id}
          version={data.version}
          published={data.challenges_released ?? false}
          canPublish={data.access_role === "superadmin"}
          open={data.challenge_votes_open ?? false}
          onChange={load}
        />
      )}
      {error && (
        <p role="alert" className="rounded border border-red-500 p-3">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded border border-green-600 p-3">
          {notice}
        </p>
      )}
      {["live", "activities", "challenges", "prizes", "rooms"].includes(
        tab,
      ) && (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              request(base + "/config", "PUT", {
                version: data.version,
                config: draft,
                reason,
              }),
            );
          }}
        >
          {(tab === "live" || tab === "rooms") && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {tab === "live"
                    ? "Configuració del Live"
                    : "Horaris del jurat"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {tab === "live" && (
                  <>
                    <label>
                      Títol
                      <Input
                        value={draft.title}
                        onChange={(e) => update("title", e.target.value)}
                      />
                    </label>
                    <label>
                      Fase
                      <select
                        className="block w-full rounded border p-2"
                        value={draft.phase}
                        onChange={(e) => update("phase", e.target.value)}
                      >
                        {["preparation", "hacking", "judging", "finished"].map(
                          (v, i) => (
                            <option value={v} key={v}>
                              {
                                [
                                  "Preparació",
                                  "Hacking",
                                  "Presentacions",
                                  "Finalitzat",
                                ][i]
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </>
                )}
                {[
                  ["deadline", "Límit de lliurament"],
                  ["judging_start", "Inici del jurat"],
                  ["judging_end", "Final del jurat"],
                ]
                  .filter(([key]) =>
                    tab === "rooms" ? key !== "deadline" : key === "deadline",
                  )
                  .map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <Input
                        type="datetime-local"
                        disabled={
                          key === "deadline" &&
                          data.access_role !== "superadmin"
                        }
                        value={localDate(draft[key])}
                        onChange={(e) =>
                          update(
                            key,
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          )
                        }
                      />
                    </label>
                  ))}
                {tab === "live" && (
                  <>
                    {[
                      ["slack_url", "Enllaç de Slack"],
                      ["stream_url", "Canal de retransmissió (URL)"],
                      ["wifi_guide_url", "Guia de connexió Wi-Fi (URL)"],
                      ["map_url", "Imatge del mapa (URL)"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <Input
                          type="url"
                          value={draft[key] || ""}
                          onChange={(e) => update(key, e.target.value || null)}
                        />
                      </label>
                    ))}
                    <label>
                      Nom de la xarxa Wi-Fi
                      <Input
                        value={draft.wifi_name || ""}
                        onChange={(e) => update("wifi_name", e.target.value)}
                        maxLength={200}
                      />
                    </label>
                    <label>
                      Indicacions de connexió (públiques)
                      <Textarea
                        value={draft.wifi_instructions || ""}
                        onChange={(e) =>
                          update("wifi_instructions", e.target.value)
                        }
                        maxLength={2000}
                      />
                    </label>
                    <label>
                      Indicacions del mapa
                      <Textarea
                        value={draft.map_notes}
                        onChange={(e) => update("map_notes", e.target.value)}
                      />
                    </label>
                  </>
                )}
                {tab === "rooms" && (
                  <>
                    <label>
                      Minuts per presentació
                      <Input
                        type="number"
                        min={1}
                        value={draft.slot_minutes}
                        onChange={(e) =>
                          update("slot_minutes", Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Minuts de desplaçament
                      <Input
                        type="number"
                        min={0}
                        value={draft.travel_minutes}
                        onChange={(e) =>
                          update("travel_minutes", Number(e.target.value))
                        }
                      />
                    </label>
                  </>
                )}
                {tab === "live" && (
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.game_enabled}
                      onChange={(e) => update("game_enabled", e.target.checked)}
                    />{" "}
                    Joc del tractor habilitat
                  </label>
                )}
              </CardContent>
            </Card>
          )}
          {Object.entries(sections)
            .filter(([key]) => (tab === "live" ? key === "faqs" : tab === "challenges" ? ["challenges", "decoy_challenges"].includes(key) : key === tab))
            .map(([key, title]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(draft[key] || []).map((item: Item, index: number) => (
                    <div
                      className="grid gap-3 rounded border p-4 md:grid-cols-2"
                      key={index}
                    >
                      {Object.entries(templates[key])
                        .filter(([field]) => field !== "resources")
                        .map(([field, initial]) => (
                          <label key={field}>
                            {labels[field] || field}
                            {typeof initial === "boolean" ? (
                              <input
                                className="ml-2"
                                type="checkbox"
                                checked={!!item[field]}
                                onChange={(e) =>
                                  updateItem(
                                    key,
                                    index,
                                    field,
                                    e.target.checked,
                                  )
                                }
                              />
                            ) : (
                              <Input
                                disabled={
                                  data.access_role !== "superadmin" &&
                                  ["points", "cost", "stock"].includes(field)
                                }
                                required={
                                  field !== "description" &&
                                  field !== "location"
                                }
                                type={
                                  typeof initial === "number"
                                    ? "number"
                                    : ["start", "end"].includes(field)
                                      ? "datetime-local"
                                      : "text"
                                }
                                value={
                                  ["start", "end"].includes(field)
                                    ? localDate(item[field])
                                    : (item[field] ?? "")
                                }
                                onChange={(e) =>
                                  updateItem(
                                    key,
                                    index,
                                    field,
                                    typeof initial === "number"
                                      ? Number(e.target.value)
                                      : ["start", "end"].includes(field)
                                        ? e.target.value
                                          ? new Date(
                                              e.target.value,
                                            ).toISOString()
                                          : ""
                                        : e.target.value,
                                  )
                                }
                              />
                            )}
                          </label>
                        ))}
                      {["challenges", "decoy_challenges"].includes(key) && (
                        <div className="space-y-2 md:col-span-2">
                          {(item.resources || []).map((r: Item, j: number) => (
                            <div className="flex gap-2" key={j}>
                              <Input
                                aria-label="Nom del recurs"
                                placeholder="Nom del recurs"
                                value={r.title}
                                onChange={(e) =>
                                  updateItem(
                                    key,
                                    index,
                                    "resources",
                                    item.resources.map((v: Item, k: number) =>
                                      j === k
                                        ? { ...v, title: e.target.value }
                                        : v,
                                    ),
                                  )
                                }
                              />
                              <Input
                                aria-label="Enllaç del recurs"
                                type="url"
                                placeholder="https://…"
                                value={r.url}
                                onChange={(e) =>
                                  updateItem(
                                    key,
                                    index,
                                    "resources",
                                    item.resources.map((v: Item, k: number) =>
                                      j === k
                                        ? { ...v, url: e.target.value }
                                        : v,
                                    ),
                                  )
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  updateItem(
                                    key,
                                    index,
                                    "resources",
                                    item.resources.filter(
                                      (_: Item, k: number) => k !== j,
                                    ),
                                  )
                                }
                              >
                                Treure
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              updateItem(key, index, "resources", [
                                ...(item.resources || []),
                                { title: "", url: "" },
                              ])
                            }
                          >
                            Afegir recurs
                          </Button>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          data.access_role !== "superadmin" &&
                          (key === "prizes" ||
                            (key === "activities" && item.points > 0))
                        }
                        onClick={() =>
                          update(
                            key,
                            draft[key].filter(
                              (_: Item, i: number) => i !== index,
                            ),
                          )
                        }
                      >
                        Treure
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      data.access_role !== "superadmin" && key === "prizes"
                    }
                    onClick={() =>
                      update(key, [
                        ...(draft[key] || []),
                        structuredClone(templates[key]),
                      ])
                    }
                  >
                    Afegir
                  </Button>
                </CardContent>
              </Card>
            ))}
          <label>
            Motiu del canvi
            <Input
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button disabled={busy}>Desar configuració</Button>
        </form>
      )}
      {tab === "meals" && (
        <div className="space-y-4">
          <p>
            Una recollida per persona i ronda. Obrir una ronda nova no esborra
            les anteriors.
          </p>
          <label>
            Motiu del canvi
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Hi ha racions disponibles"
            />
          </label>
          {data.meals.map((meal: Item) => {
            const r = data.meal_rounds?.[meal.id] || { round: 1, open: true };
            const counts = data.meal_counts?.find(
              (c: Item) => c.meal_id === meal.id,
            );
            return (
              <Card key={meal.id}>
                <CardHeader>
                  <CardTitle>
                    {meal.name} · Ronda {r.round} ·{" "}
                    {r.open ? "Oberta" : "Tancada"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p>
                    {counts?.unique_participants || 0} persones ·{" "}
                    {counts?.rounds
                      .map((c: Item) => `Ronda ${c.round}: ${c.count}`)
                      .join(" · ")}
                  </p>
                  <div className="flex gap-2">
                    {[
                      ["next", "Obrir ronda següent"],
                      [
                        r.open ? "close" : "open",
                        r.open ? "Tancar ronda" : "Reobrir ronda",
                      ],
                    ].map(([action, label]) => (
                      <Button
                        key={action}
                        disabled={busy || reason.trim().length < 3}
                        onClick={() =>
                          void run(() =>
                            request(`${base}/meals/${meal.id}/round`, "POST", {
                              action,
                              expected_round: r.round,
                              reason,
                            }),
                          )
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {tab === "coins" && (
        <form
          className="grid max-w-xl gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              scan.kind === "redeem" &&
              !window.confirm(
                "Confirmar el lliurament del premi i el descompte de punts?",
              )
            )
              return;
            void run(async () => {
              const result = await request<Item>(base + "/scan", "POST", {
                ...scan,
                amount: scan.kind === "award" ? scan.amount : 0,
                operation_id: crypto.randomUUID(),
                device: "llh-admin",
              });
              setScan((s) => ({ ...s, code: "" }));
              return result;
            }, "Operació registrada al historial");
          }}
        >
          <label>
            Operació
            <select
              className="block w-full border p-2"
              value={scan.kind}
              onChange={(e) => setScan({ ...scan, kind: e.target.value })}
            >
              {data.access_role === "superadmin" && (
                <option value="award">Atorgar LleidaCoins</option>
              )}
              <option value="redeem">Bescanviar premi</option>
              {data.access_role === "superadmin" && (
                <option value="reverse">Corregir moviment</option>
              )}
              {data.access_role === "superadmin" && (
                <option value="void_scan">Corregir entrega d’àpat</option>
              )}
              <option value="activity">Registrar activitat</option>
            </select>
          </label>
          <label>
            Codi del participant o acreditació
            <Input
              required
              value={scan.code}
              onChange={(e) => setScan({ ...scan, code: e.target.value })}
            />
          </label>
          {scan.kind === "award" ? (
            <label>
              Punts
              <Input
                type="number"
                min={1}
                value={scan.amount}
                onChange={(e) =>
                  setScan({ ...scan, amount: Number(e.target.value) })
                }
              />
            </label>
          ) : ["reverse", "void_scan"].includes(scan.kind) ? (
            <label>
              {scan.kind === "void_scan"
                ? "Número de l’entrega original"
                : "Número del moviment original"}
              <Input
                required
                value={scan.target}
                onChange={(e) => setScan({ ...scan, target: e.target.value })}
              />
            </label>
          ) : (
            <label>
              {scan.kind === "redeem" ? "Premi" : "Activitat"}
              <select
                required
                className="block w-full border p-2"
                value={scan.target}
                onChange={(e) => setScan({ ...scan, target: e.target.value })}
              >
                <option value="">Selecciona…</option>
                {data[scan.kind === "redeem" ? "prizes" : "activities"].map(
                  (v: Item) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                      {v.cost ? ` · ${v.cost} punts · ${v.stock} unitats` : ""}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <label>
            Motiu
            <Input
              required
              minLength={3}
              value={scan.reason}
              onChange={(e) => setScan({ ...scan, reason: e.target.value })}
            />
          </label>
          <Button disabled={busy}>Registrar</Button>
        </form>
      )}
      {tab === "alerts" && (
        <div className="space-y-4">
          <form
            className="grid max-w-xl gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  request(base + "/alerts", "POST", {
                    ...alert,
                    expires_at: new Date(
                      Date.now() + alertMinutes * 60000,
                    ).toISOString(),
                  }),
                "Avís desat als canals seleccionats. Consulta l’estat de Discord a sota.",
              );
            }}
          >
            <label>
              Tipus d’avís
              <select
                className="block rounded border p-2"
                value={alert.category}
                onChange={(e) =>
                  setAlert({ ...alert, category: e.target.value })
                }
              >
                <option value="general">General</option>
                <option value="activity">Activitat</option>
                <option value="meal">Àpat</option>
              </select>
            </label>
            <label>
              Visible durant (minuts)
              <Input
                type="number"
                min={1}
                max={1440}
                value={alertMinutes}
                onChange={(e) => setAlertMinutes(Number(e.target.value))}
              />
            </label>
            <fieldset className="space-y-2">
              <legend>Destinacions</legend>
              <label className="block">
                <input
                  type="checkbox"
                  checked={alert.live}
                  onChange={(e) =>
                    setAlert({ ...alert, live: e.target.checked })
                  }
                />{" "}
                Live i pantalles (WebSocket)
              </label>
              <label className="block">
                <input
                  type="checkbox"
                  checked={alert.discord}
                  onChange={(e) =>
                    setAlert({ ...alert, discord: e.target.checked })
                  }
                />{" "}
                Bot de Discord · canal oficial
              </label>
            </fieldset>
            {alert.discord && !discord?.configured && (
              <p role="status">
                El bot encara no està connectat. L’avís quedarà pendent fins que
                es connecti o caduqui.
              </p>
            )}
            <Input
              required
              placeholder="Títol"
              aria-label="Títol de l'avís"
              value={alert.title}
              onChange={(e) => setAlert({ ...alert, title: e.target.value })}
            />
            <Textarea
              required
              placeholder="Missatge"
              aria-label="Missatge de l'avís"
              value={alert.message}
              onChange={(e) => setAlert({ ...alert, message: e.target.value })}
            />
            <select
              value={alert.level}
              onChange={(e) => setAlert({ ...alert, level: e.target.value })}
            >
              <option value="info">Informació</option>
              <option value="warning">Important</option>
              <option value="danger">Urgent</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={alert.push}
                onChange={(e) => setAlert({ ...alert, push: e.target.checked })}
              />{" "}
              Enviar també notificació push
            </label>
            <Button
              disabled={busy || !(alert.live || alert.push || alert.discord)}
            >
              Publicar avís
            </Button>
          </form>
          <section className="space-y-2">
            <h3 className="font-semibold">Entregues a Discord</h3>
            <p>
              {discord?.configured
                ? "Integració configurada; esperant el bot o les seves confirmacions."
                : "Integració pendent de configurar."}
            </p>
            {discord?.deliveries.map((d) => (
              <p key={d.id} className="rounded border p-2">
                Avís {d.alert_id} ·{" "}
                {{
                  pending: "Pendent",
                  leased: "Enviant",
                  sent: "Enviat",
                  failed: "Error",
                  expired: "Caducat",
                  cancelled: "Cancel·lat",
                }[d.state as string] || d.state}{" "}
                · Intents: {d.attempts}
                {d.message_id && ` · Missatge: ${d.message_id}`}
                {d.error && ` · ${d.error}`}
              </p>
            ))}
          </section>
          {data.alerts.map((a: Item) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <strong>{a.title}</strong>
                <p>{a.message}</p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(() => request(base + `/alerts/${a.id}`, "DELETE"))
                  }
                >
                  Retirar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {tab === "devpost" && (
        <DevpostImport
          key={id}
          eventId={id}
          challenges={data.challenges}
          teams={data.teams}
          onImported={load}
        />
      )}
      {tab === "judging" && (
        <div className="space-y-4">
          <p>
            Una sala de repte per equip i MLH opcional. La generació evita
            solapaments i respecta els torns fixats.
          </p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                request(`${base}/teams/${enroll.group}/enroll`, "POST", {
                  challenge: enroll.challenge,
                  mlh: enroll.mlh,
                  reason: "Organizer enrollment",
                }),
              );
            }}
          >
            <select
              required
              value={enroll.group}
              onChange={(e) => setEnroll({ ...enroll, group: e.target.value })}
            >
              <option value="">Equip…</option>
              {data.teams.map((t: Item) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              required
              value={enroll.challenge}
              onChange={(e) =>
                setEnroll({ ...enroll, challenge: e.target.value })
              }
            >
              <option value="">Repte…</option>
              {data.challenges
                .filter((c: Item) => c.published)
                .map((c: Item) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={enroll.mlh}
                onChange={(e) =>
                  setEnroll({ ...enroll, mlh: e.target.checked })
                }
              />{" "}
              MLH
            </label>
            <Button disabled={busy}>Assignar</Button>
          </form>
          <Button
            disabled={busy}
            onClick={() => void run(() => request(base + "/schedule", "POST"))}
          >
            Generar / recalcular horaris
          </Button>
          <Button
            variant="outline"
            onClick={() => void run(load, "Actualitzat")}
          >
            Actualitzar
          </Button>
          {data.presentations.map((p: Item) => (
            <PresentationRow
              key={`${p.id}-${p.version}`}
              presentation={p}
              rooms={data.rooms}
              busy={busy}
              canOverride={data.access_role === "superadmin"}
              save={(body) =>
                run(() =>
                  request(`${base}/presentations/${p.id}`, "PATCH", body),
                )
              }
            />
          ))}
        </div>
      )}
      {tab === "roles" && data.access_role === "superadmin" && (
        <div className="space-y-4">
          <p>
            Els rols són globals. Només el superadmin els pot canviar; cada
            canvi queda registrat.
          </p>
          <label>
            Motiu
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {staff.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-3 rounded border p-4"
            >
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <select
                aria-label={`Rol de ${user.name}`}
                value={user.role}
                onChange={(e) =>
                  setStaff(
                    staff.map((u) =>
                      u.id === user.id ? { ...u, role: e.target.value } : u,
                    ),
                  )
                }
              >
                {["superadmin", "admin", "lleidahacker", "hacker"].map(
                  (role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ),
                )}
              </select>
              <Button
                disabled={busy || reason.trim().length < 3}
                onClick={() =>
                  void run(() =>
                    request(`${base}/staff/${user.id}`, "PATCH", {
                      role: user.role,
                      reason,
                    }),
                  )
                }
              >
                Desar rol
              </Button>
            </div>
          ))}
        </div>
      )}
      {tab === "audit" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Filtrar acció: meal, award, redeem…"
              value={historyAction}
              onChange={(e) => setHistoryAction(e.target.value)}
            />
            <Button onClick={() => void historyPage()}>Cercar</Button>
          </div>
          {history.map((a) => (
            <details key={a.id} className="rounded border p-3">
              <summary>
                #{a.id} · {new Date(a.created_at).toLocaleString()} · {a.action}{" "}
                · {a.outcome === "success" ? "Confirmat" : "Rebutjat"} ·
                Organitzador {a.actor_name || a.actor_id || "Servei"} ·
                Participant {a.participant_name || a.user_id || "—"}
              </summary>
              <p>Punt de lectura: {a.device || "Panel"}</p>
              <p>Motiu: {a.details.reason || a.result.error || "—"}</p>
              {a.scans?.map((s: Item) => (
                <p key={s.id}>
                  Entrega #{s.id} · {s.kind} · Ronda {s.round} ·{" "}
                  {s.voided ? "Anul·lada amb correcció" : "Confirmada"}
                </p>
              ))}
              {a.movements?.map((m: Item) => (
                <p key={m.id}>
                  Moviment #{m.id} · {m.amount > 0 ? "+" : ""}
                  {m.amount} LC · Saldo {m.balance_before} → {m.balance_after} ·{" "}
                  {m.reason}
                  {m.reversal_of ? ` · Corregeix #${m.reversal_of}` : ""}
                </p>
              ))}
              {a.details.before?.round && (
                <p>
                  Ronda {a.details.before.round} → {a.details.after.round}
                </p>
              )}
              {a.details.original_scan_id && (
                <p>Corregeix l’entrega #{a.details.original_scan_id}</p>
              )}
            </details>
          ))}
          <Button variant="outline" onClick={() => void historyPage(true)}>
            Carregar anteriors
          </Button>
        </div>
      )}
    </div>
  );
}
function PresentationRow({
  presentation: p,
  rooms,
  busy,
  canOverride,
  save,
}: {
  presentation: Item;
  rooms: Item[];
  busy: boolean;
  canOverride: boolean;
  save: (body: Item) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Item>({
    ...p,
    pinned: !!p.pinned,
    override: false,
    reason: "",
  });
  return (
    <form
      className="grid gap-3 rounded border p-4 md:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save(draft);
      }}
    >
      <strong>{p.team}</strong>
      <select
        aria-label="Sala"
        value={draft.room}
        onChange={(e) => setDraft({ ...draft, room: e.target.value })}
      >
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>
      <select
        aria-label="Estat"
        value={draft.state}
        onChange={(e) => setDraft({ ...draft, state: e.target.value })}
      >
        {["waiting", "called", "presenting", "done", "absent", "postponed"].map(
          (s, i) => (
            <option key={s} value={s}>
              {
                [
                  "En espera",
                  "Cridat",
                  "Presentant",
                  "Finalitzat",
                  "Absent",
                  "Ajornat",
                ][i]
              }
            </option>
          ),
        )}
      </select>
      <label>
        Ordre
        <Input
          type="number"
          min={0}
          value={draft.position}
          onChange={(e) =>
            setDraft({ ...draft, position: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Hora estimada
        <Input
          type="datetime-local"
          value={localDate(draft.scheduled_at)}
          onChange={(e) =>
            setDraft({
              ...draft,
              scheduled_at: e.target.value
                ? new Date(e.target.value).toISOString()
                : null,
            })
          }
        />
      </label>
      <div>
        <label className="block">
          <input
            type="checkbox"
            checked={draft.pinned}
            onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
          />{" "}
          Fixar horari
        </label>
        <label>
          <input
            type="checkbox"
            disabled={!canOverride}
            checked={draft.override}
            onChange={(e) => setDraft({ ...draft, override: e.target.checked })}
          />{" "}
          Autoritzar excepció
        </label>
      </div>
      <Input
        required
        minLength={3}
        placeholder="Motiu del canvi"
        aria-label="Motiu del canvi de torn"
        value={draft.reason}
        onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
      />
      <Button disabled={busy}>Aplicar canvi</Button>
    </form>
  );
}
