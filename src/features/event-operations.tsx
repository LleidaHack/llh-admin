"use client";
import { CsvImport } from "@/components/csv-import";
import { importChallenges } from "@/lib/csv-import";

import { useCallback, useEffect, useRef, useState } from "react";
import { setUnsavedChanges } from "@/lib/unsaved";
import { ChallengeChoices } from "./challenge-choices";
import { DiscordCardEditor, emptyDiscordCard } from "./discord-card-editor";
import { DevpostImport } from "./devpost-import";
import { ApiError, request, errorMessage } from "@/lib/api";
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
  company: "Empresa",
  answer: "Resposta",
  cost: "Cost",
  stock: "Unitats disponibles",
  published: "Publicat",
  paused: "En pausa",
  url: "Enllaç",
};
const templates: Record<string, Item> = {
  challenges: {
    company: "",
    id: "",
    title: "",
    description: "",
    published: false,
    resources: [],
  },
  decoy_challenges: {
    company: "",
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
  const [teamQuery, setTeamQuery] = useState("");
  const [staff, setStaff] = useState<Item[]>([]);
  const tab = section;
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
    mode?: "webhook" | "bot" | null;
    deliveries: Item[];
  } | null>(null);
  const [discordCard, setDiscordCard] = useState(emptyDiscordCard);
  const [alertMinutes, setAlertMinutes] = useState(60);
  const [enroll, setEnroll] = useState({
    group: "",
    challenge: "",
    mlh: false,
  });
  const scanAttempt = useRef<{ key: string; id: string } | null>(null);
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
  const dirty =
    !!data && !!draft && JSON.stringify(draft) !== JSON.stringify(data);
  useEffect(() => {
    setUnsavedChanges(dirty);
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => setUnsavedChanges(false), []);
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
  async function run(
    fn: () => Promise<unknown>,
    message = "Canvi desat",
    opts: { save?: boolean } = {},
  ) {
    // Every action reloads the configuration, which replaces the draft.
    if (
      !opts.save &&
      dirty &&
      !window.confirm(
        "Tens canvis de configuració sense desar. Aquesta acció els descartarà. Vols continuar?",
      )
    )
      return;
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
  const fold = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const teamNeedle = fold(teamQuery.trim());
  const visiblePresentations: Item[] = (data.presentations ?? []).filter(
    (p: Item) =>
      !teamNeedle ||
      fold(
        `${p.team} ${data.rooms?.find((r: Item) => r.id === p.room)?.title ?? ""}`,
      ).includes(teamNeedle),
  );
  return (
    <div className="event-operations space-y-5">
      {section === "challenges" && (
        <ChallengeChoices
          id={id}
          version={data.version}
          published={data.challenges_released ?? false}
          canPublish={data.access_role === "superadmin"}
          blocked={dirty}
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
            void run(
              () =>
                request(base + "/config", "PUT", {
                  version: data.version,
                  config: draft,
                  reason: `Update ${tab} configuration from management`,
                }),
              "Canvi desat",
              { save: true },
            );
          }}
        >
          {(dirty || busy) && (
            <div
              className="sticky top-20 z-20 md:top-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-md"
              aria-label="Desar canvis"
            >
              <p className="min-w-0 text-sm" role={error ? "alert" : "status"}>
                {busy
                  ? "Desant…"
                  : error ||
                    (dirty
                      ? "Canvis pendents de desar"
                      : notice || "Configuració desada")}
              </p>
              {dirty && (
                <Button type="submit" disabled={busy} className="shrink-0">
                  {busy ? "Desant…" : "Desar canvis"}
                </Button>
              )}
            </div>
          )}
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
                      ["slack_url", "Invitació de Discord"],
                      [
                        "stream_url",
                        "Enllaç del vídeo en directe de YouTube (URL)",
                      ],
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
                    <Button
                      type="button"
                      role="switch"
                      aria-checked={!!draft.stream_enabled}
                      onClick={() =>
                        update("stream_enabled", !draft.stream_enabled)
                      }
                      variant={draft.stream_enabled ? "default" : "outline"}
                    >
                      Mostrar retransmissió:{" "}
                      {draft.stream_enabled ? "Sí" : "No"}
                    </Button>
                    <p>
                      Enganxa l’enllaç del vídeo i activa la retransmissió quan
                      comenci. Desa els canvis. Desactiva-la quan acabi; no es
                      detecta automàticament.
                    </p>
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
            .filter(([key]) =>
              tab === "live"
                ? key === "faqs"
                : tab === "challenges"
                  ? ["challenges", "decoy_challenges"].includes(key)
                  : key === tab,
            )
            .map(([key, title]) => (
              <Card key={key}>
                {key !== tab && (
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                )}
                <CardContent className="space-y-4">
                  {["challenges", "decoy_challenges"].includes(key) && (
                    <CsvImport
                      label="Importar reptes des de CSV"
                      disabled={busy}
                      template={[
                        ["id", "company", "title", "description", "published"],
                        [
                          "rodi-demo",
                          "Rodi",
                          "El teu vehicle, sempre a punt",
                          "Repte fictici de mostra: crea un pla de manteniment personalitzat.",
                          "false",
                        ],
                      ]}
                      validate={(rows) => {
                        importChallenges(
                          rows,
                          (draft[key] || []).map((item: Item) => item.id),
                        );
                      }}
                      onImport={async (rows, progress) => {
                        const imported = importChallenges(
                          rows,
                          (draft[key] || []).map((item: Item) => item.id),
                        );
                        update(key, [...(draft[key] || []), ...imported]);
                        progress(imported.length);
                        setNotice(
                          "Reptes afegits al borrador. Desa els canvis per aplicar-los.",
                        );
                      }}
                    />
                  )}
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
                                  field !== "company" &&
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
        </form>
      )}
      {tab === "meals" && (
        <div className="space-y-4">
          <p>
            Una recollida per persona i ronda. Obrir una ronda nova no esborra
            les anteriors.
          </p>
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
                        disabled={busy}
                        onClick={() =>
                          window.confirm(
                            `${label} de ${meal.name}? Els escàners hauran d’actualitzar abans de continuar.`,
                          ) &&
                          void run(() =>
                            request(`${base}/meals/${meal.id}/round`, "POST", {
                              action,
                              expected_round: r.round,
                              reason: `Meal ${meal.id}: ${action} round from management`,
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
            const confirmations: Record<string, string> = {
              redeem:
                "Confirmar el lliurament del premi i el descompte de punts?",
              reverse:
                "Corregir aquest moviment? Es registrarà un moviment invers.",
              void_scan: "Anul·lar aquesta entrega d’àpat?",
            };
            if (
              confirmations[scan.kind] &&
              !window.confirm(confirmations[scan.kind])
            )
              return;
            const payload = {
              ...scan,
              amount: scan.kind === "award" ? scan.amount : 0,
              device: "llh-admin",
            };
            // Reuse the operation_id when the same request is resent after a
            // failure, so a lost response cannot apply the operation twice.
            const key = JSON.stringify(payload);
            if (scanAttempt.current?.key !== key)
              scanAttempt.current = { key, id: crypto.randomUUID() };
            const operationId = scanAttempt.current.id;
            void run(async () => {
              try {
                const result = await request<Item>(base + "/scan", "POST", {
                  ...payload,
                  operation_id: operationId,
                });
                scanAttempt.current = null;
                setScan((s) => ({ ...s, code: "" }));
                return result;
              } catch (e) {
                // Definitive rejections get a fresh id on the next attempt;
                // ambiguous failures (network, 5xx, 408, 429) keep it.
                const status = e instanceof ApiError ? e.status : 0;
                if (status > 0 && status < 500 && ![408, 429].includes(status))
                  scanAttempt.current = null;
                throw e;
              }
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
                    discord_card: alert.discord
                      ? discordCard.enabled
                        ? {
                            ...discordCard,
                            url: discordCard.url || null,
                            image_url: discordCard.image_url || null,
                            thumbnail_url: discordCard.thumbnail_url || null,
                          }
                        : { enabled: false }
                      : undefined,
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
                Discord · canal oficial
              </label>
            </fieldset>
            {alert.discord && !discord?.configured && (
              <p role="status">
                Discord no està configurat per a aquest esdeveniment. L’avís
                quedarà pendent fins que es connecti o caduqui.
              </p>
            )}
            <Input
              required
              placeholder="Títol"
              maxLength={150}
              aria-label="Títol de l'avís"
              value={alert.title}
              onChange={(e) => setAlert({ ...alert, title: e.target.value })}
            />
            <Textarea
              required
              placeholder="Missatge"
              maxLength={2000}
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
            {alert.discord && (
              <DiscordCardEditor
                card={discordCard}
                onChange={setDiscordCard}
                title={alert.title}
                message={alert.message}
              />
            )}
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
                ? discord.mode === "webhook"
                  ? "Webhook configurat. Consulta les confirmacions d’entrega a sota."
                  : "Bot configurat. Consulta les confirmacions d’entrega a sota."
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
                    window.confirm(
                      "Retirar l’avís? Desapareix del Live i es cancel·len els enviaments pendents (push i Discord). Els ja enviats no es poden desfer.",
                    ) &&
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
            solapaments, respecta el temps de trasllat i compara diferents
            ordres per reduir la durada total. Els torns fixats o començats es
            conserven.
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
            onClick={() =>
              window.confirm(
                "Recalcular els horaris? Es reassignaran tots els torns pendents que no estiguin fixats.",
              ) && void run(() => request(base + "/schedule", "POST"))
            }
          >
            Generar / recalcular horaris
          </Button>
          <Button
            variant="outline"
            onClick={() => void run(load, "Actualitzat")}
          >
            Actualitzar
          </Button>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.rooms.map((room: Item) => {
              const turns = data.presentations.filter(
                (p: Item) => p.room === room.id,
              );
              const times = turns
                .filter((p: Item) => p.scheduled_at)
                .map((p: Item) => Date.parse(p.scheduled_at));
              const finish = times.length
                ? new Date(
                    Math.max(...times) + data.slot_minutes * 60000,
                  ).toLocaleTimeString("ca", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;
              return (
                <Card key={room.id} className="py-3">
                  <CardContent className="">
                    <strong>{room.title}</strong>
                    <p>
                      {turns.length} equips
                      {finish
                        ? ` · Final previst: ${finish}`
                        : " · Sense horari"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Input
            type="search"
            aria-label="Cercar equip"
            placeholder="Cercar equip o sala…"
            className="sm:max-w-sm"
            value={teamQuery}
            onChange={(e) => setTeamQuery(e.target.value)}
          />
          {!visiblePresentations.length && (
            <p className="text-sm text-muted-foreground">
              Cap equip coincideix amb la cerca.
            </p>
          )}
          {visiblePresentations.map((p: Item) => (
            <PresentationRow
              key={`${p.id}-${p.version}`}
              presentation={p}
              rooms={data.rooms}
              busy={busy}
              canOverride={data.access_role === "superadmin"}
              recover={(action, room, reason, operationId) =>
                run(() =>
                  request(`${base}/presentations/${p.id}/recovery`, "POST", {
                    action,
                    room,
                    reason,
                    version: p.version,
                    operation_id: operationId,
                  }),
                )
              }
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
                {[
                  "superadmin",
                  "admin",
                  "lleidahacker",
                  "hacker",
                  "mentor",
                ].map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    request(`${base}/staff/${user.id}`, "PATCH", {
                      role: user.role,
                      reason: `Assign ${user.role} role from management`,
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
  recover,
  save,
}: {
  presentation: Item;
  rooms: Item[];
  busy: boolean;
  canOverride: boolean;
  recover: (
    action: string,
    room: string | null,
    reason: string,
    operationId: string,
  ) => Promise<void>;
  save: (body: Item) => Promise<void>;
}) {
  const recoveryAttempt = useRef<{ key: string; id: string } | null>(null);
  async function recovery(action: string) {
    const reason = prompt("Motiu de la correcció (quedarà a l’historial):");
    if (!reason || reason.trim().length < 3) return;
    const room = action === "move" ? draft.room : null;
    const key = JSON.stringify([action, room, reason]);
    if (recoveryAttempt.current?.key !== key)
      recoveryAttempt.current = { key, id: crypto.randomUUID() };
    await recover(action, room, reason, recoveryAttempt.current.id);
  }
  const [draft, setDraft] = useState<Item>({
    ...p,
    pinned: !!p.pinned,
    override: false,
  });
  const dirty =
    draft.room !== p.room ||
    draft.state !== p.state ||
    draft.position !== p.position ||
    draft.scheduled_at !== p.scheduled_at ||
    draft.pinned !== !!p.pinned ||
    draft.override;
  const STATES = [
    ["waiting", "En espera"],
    ["called", "Cridat"],
    ["presenting", "Presentant"],
    ["done", "Finalitzat"],
    ["absent", "Absent"],
    ["postponed", "Ajornat"],
  ];
  return (
    <form
      className="flex flex-col gap-2 rounded border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save({
          ...draft,
          reason: draft.override
            ? "Override presentation constraints from management"
            : "Update presentation from management",
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <strong className="min-w-32 flex-1">{p.team}</strong>
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
          {STATES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input
          aria-label="Ordre"
          title="Ordre"
          type="number"
          min={0}
          className="w-16"
          value={draft.position}
          onChange={(e) =>
            setDraft({ ...draft, position: Number(e.target.value) })
          }
        />
        <Input
          aria-label="Hora estimada"
          title="Hora estimada"
          type="datetime-local"
          className="w-auto"
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
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={draft.pinned}
            onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
          />
          Fixar
        </label>
        {canOverride && (
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={draft.override}
              onChange={(e) =>
                setDraft({ ...draft, override: e.target.checked })
              }
            />
            Excepció
          </label>
        )}
        {dirty && (
          <Button size="sm" disabled={busy}>
            Desar
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {["waiting", "called", "postponed"].includes(p.state) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void recovery("absent")}
          >
            Absent i cridar següent
          </Button>
        )}
        {["absent", "postponed", "called"].includes(p.state) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void recovery("requeue")}
          >
            Al final de la cua
          </Button>
        )}
        {!["presenting", "done"].includes(p.state) && draft.room !== p.room && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void recovery("move")}
          >
            Moure a la sala seleccionada
          </Button>
        )}
      </div>
    </form>
  );
}
