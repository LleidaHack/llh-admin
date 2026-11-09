"use client";

import { useEffect, useRef, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Project = {
  url: string;
  title: string;
  group_id: number;
  challenge: string;
  mlh: boolean;
};
type Row = {
  row: number;
  title: string;
  team_code: string;
  team?: string;
  status: string;
  action: string;
  challenge?: string;
  mlh?: boolean;
  errors: string[];
  warnings: string[];
};
type Preview = {
  headers: string[];
  columns: Record<string, string>;
  challenge_values: string[];
  rows: Row[];
  errors: string[];
  ready: boolean;
  digest: string;
  count: number;
};
const fields: Record<string, string> = {
  url: "URL del projecte",
  title: "Nom del projecte",
  description: "Descripció (opcional)",
  repository_url: "Repositori (opcional)",
  demo_url: "Demo / vídeo (opcional)",
  team: "Codi d’equip HackEPS",
  challenge: "Repte",
  mlh: "MLH (opcional)",
  status: "Estat de l’entrega",
};
const messages: Record<string, string> = {
  "Import preview is stale; preview again":
    "Les dades han canviat. Torna a previsualitzar abans d’importar.",
  "Resolve all preview errors before importing":
    "Resol els errors de la previsualització abans d’importar.",
  "CSV headers must be unique, non-empty, and bounded":
    "Les capçaleres del CSV han de ser úniques i no poden estar buides.",
  "Invalid or empty CSV": "El CSV és buit o té un format incorrecte.",
  "Map each field to a different CSV column":
    "Assigna una columna diferent a cada camp.",
  "The CSV has no projects": "El CSV no conté projectes.",
  "CSV exceeds 2000 projects": "El CSV supera el límit de 2.000 projectes.",
  "Select at least one completed submission status":
    "Indica almenys un estat d’entrega completa.",
  "Select the url column": "Selecciona la columna de l’URL.",
  "Select the title column": "Selecciona la columna del nom del projecte.",
  "Select the team column": "Selecciona la columna del codi d’equip.",
  "Select the challenge column": "Selecciona la columna del repte.",
  "Select the status column or confirm this export excludes drafts":
    "Selecciona l’estat o confirma que l’exportació exclou esborranys.",
  "Not a selected completed status; excluded":
    "Estat no seleccionat com a entrega completa; exclòs.",
  "Team code does not belong to this event":
    "El codi d’equip no correspon a aquest esdeveniment.",
  "Map this challenge to one published challenge with a room":
    "Assigna un repte publicat amb sala configurada.",
  "Existing turns and manual adjustments will be preserved":
    "Es conservaran els torns i els ajustos manuals existents.",
  "Imported challenge/MLH differs from the queue; review the team manually":
    "El repte o MLH difereixen dels torns actuals. Revisa l’equip a Presentacions.",
  "Duplicate project or team in this CSV": "Projecte o equip duplicat al CSV.",
  "Project is already linked to a different team":
    "El projecte ja està vinculat a un altre equip.",
  "Team is already linked to another project":
    "L’equip ja està vinculat a un altre projecte.",
  "No completed submissions match the selected statuses":
    "Cap entrega coincideix amb els estats seleccionats.",
  "MLH must be yes/no, true/false, or 1/0":
    "MLH ha de ser sí/no, true/false o 1/0.",
  "Configure the MLH room first": "Configura primer la sala MLH.",
  "Project title must contain 1–150 characters":
    "El nom del projecte ha de tenir entre 1 i 150 caràcters.",
  "Expected an https://devpost.com/software/... project URL":
    "Cal un enllaç de projecte https://devpost.com/software/…",
};
const explain = (message: string) => messages[message] || message;

export function DevpostImport({
  eventId,
  challenges,
  teams,
  onImported,
}: {
  eventId: number;
  challenges: { id: string; title: string; published: boolean }[];
  teams: { id: number; name: string; code?: string }[];
  onImported: () => Promise<void>;
}) {
  const base = `/v1/operations/${eventId}/devpost`;
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [statuses, setStatuses] = useState("submitted, complete, completed");
  const [completedOnly, setCompletedOnly] = useState(false);
  const [plan, setPlan] = useState<Preview | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const operationId = useRef("");
  const load = () => request<Project[]>(base + "/projects").then(setProjects);
  useEffect(() => {
    void request<Project[]>(base + "/projects")
      .then(setProjects)
      .catch((e) => setError(explain(errorMessage(e))));
  }, [base]);
  function invalidate() {
    setPlan(null);
    setNotice("");
    operationId.current = "";
  }
  const payload = () => ({
    csv_text: csv,
    filename,
    columns,
    challenges: mapping,
    completed_statuses: statuses
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    completed_only: completedOnly,
  });
  async function upload(file?: File) {
    if (!file) return;
    invalidate();
    setCsv("");
    setHeaders([]);
    setValues([]);
    setColumns({});
    setMapping({});
    setError("");
    if (file.size > 1_000_000) {
      setError("El fitxer supera 1 MB.");
      return;
    }
    setBusy(true);
    try {
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        );
      } catch {
        throw new Error(
          "El fitxer no està en UTF-8. Exporta’l de nou des de Devpost o desa’l com a «CSV UTF-8».",
        );
      }
      const result = await request<Preview>(base + "/preview", "POST", {
        csv_text: text,
        filename: file.name,
      });
      setCsv(text);
      setFilename(file.name);
      setHeaders(result.headers);
      setColumns(result.columns);
      setValues(result.challenge_values);
    } catch (e) {
      setError(explain(errorMessage(e)));
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    invalidate();
    setBusy(true);
    setError("");
    try {
      const result = await request<Preview>(
        base + "/preview",
        "POST",
        payload(),
      );
      setPlan(result);
      setValues(result.challenge_values);
      operationId.current = crypto.randomUUID();
    } catch (e) {
      setError(explain(errorMessage(e)));
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!plan?.ready) return;
    setBusy(true);
    setError("");
    try {
      const result = await request<{
        imported: number;
        created_turns: number;
        skipped: number;
        audit_id: number;
      }>(base + "/import", "POST", {
        ...payload(),
        reason,
        preview_digest: plan.digest,
        operation_id: operationId.current,
      });
      setPlan(null);
      setNotice(
        `${result.imported} projectes importats · ${result.created_turns} torns nous · ${result.skipped} files excloses · Registre #${result.audit_id}.`,
      );
      await load();
      await onImported();
    } catch (e) {
      setError(explain(errorMessage(e)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Importar projectes de Devpost</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Exporta el CSV des de Devpost → Manage → Metrics → Projects data. El
            formulari de Devpost ha d’incloure el codi d’equip HackEPS, el repte
            i, opcionalment, MLH.
          </p>
          <p className="text-sm">
            Els equips nous tindran un torn del repte i un altre de MLH si hi
            participen. Els torns existents es conserven. Després pots generar
            els horaris a Presentacions.
          </p>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <fieldset disabled={busy} className="space-y-4">
            <label className="block space-y-2">
              Fitxer CSV (UTF-8, màxim 1 MB)
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            {headers.length > 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(fields).map(([key, label]) => (
                    <label key={key} className="grid gap-2 text-sm">
                      {label}
                      <select
                        className="rounded border bg-background p-2"
                        value={columns[key] || ""}
                        onChange={(e) => {
                          invalidate();
                          setColumns({ ...columns, [key]: e.target.value });
                          setValues([]);
                        }}
                      >
                        <option value="">Sense columna</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={completedOnly}
                    onChange={(e) => {
                      invalidate();
                      setCompletedOnly(e.target.checked);
                    }}
                  />
                  Confirmo que he exportat només entregues completes, sense
                  esborranys.
                </label>
                {!completedOnly && (
                  <label className="grid gap-2 text-sm">
                    Valors d’estat que signifiquen entrega completa (separats
                    per comes)
                    <Input
                      value={statuses}
                      onChange={(e) => {
                        invalidate();
                        setStatuses(e.target.value);
                      }}
                    />
                  </label>
                )}
                {values.length > 0 && (
                  <div className="grid gap-3">
                    <h3 className="font-bold">Correspondència de reptes</h3>
                    {values.map((value) => (
                      <label
                        key={value}
                        className="grid gap-2 text-sm md:grid-cols-2"
                      >
                        <span>{value}</span>
                        <select
                          className="rounded border bg-background p-2"
                          value={mapping[value] || ""}
                          onChange={(e) => {
                            invalidate();
                            setMapping({ ...mapping, [value]: e.target.value });
                          }}
                        >
                          <option value="">
                            Coincidir per identificador o nom exacte
                          </option>
                          {challenges
                            .filter((c) => c.published && c.id !== "mlh")
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => void preview()}
                  disabled={!csv}
                >
                  Previsualitzar importació
                </Button>
              </>
            )}
          </fieldset>
          {plan && (
            <div className="space-y-4">
              {plan.errors.map((e) => (
                <p key={e} role="alert" className="text-destructive">
                  {explain(e)}
                </p>
              ))}
              <p className="text-sm">
                {plan.count} entregues seleccionades de {plan.rows.length}{" "}
                files. Cap canvi s’ha desat encara.
              </p>
              <div className="max-h-[32rem] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">Fila / projecte</th>
                      <th className="p-2">Equip</th>
                      <th className="p-2">Repte / MLH</th>
                      <th className="p-2">Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.rows.map((r) => (
                      <tr key={r.row} className="border-t">
                        <td className="p-2">
                          {r.row}. {r.title}
                          <div className="text-xs text-muted-foreground">
                            {r.status}
                          </div>
                        </td>
                        <td className="p-2">{r.team || r.team_code}</td>
                        <td className="p-2">
                          {r.challenge || "—"}
                          {r.mlh && " + MLH"}
                        </td>
                        <td className="p-2">
                          {
                            {
                              skip: "Exclòs",
                              create: "Nou projecte",
                              update: "Actualitzar projecte",
                              import: "Importar",
                            }[r.action]
                          }
                          {r.errors.map((e) => (
                            <p key={e} className="text-destructive">
                              {explain(e)}
                            </p>
                          ))}
                          {r.warnings.map((w) => (
                            <p key={w} className="text-muted-foreground">
                              {explain(w)}
                            </p>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="grid gap-2 text-sm">
                Motiu de la importació
                <Input
                  disabled={busy}
                  value={reason}
                  maxLength={500}
                  onChange={(e) => {
                    setReason(e.target.value);
                    operationId.current = crypto.randomUUID();
                  }}
                  placeholder="Entregues finals de la hackató"
                />
              </label>
              <Button
                disabled={busy || !plan.ready || reason.trim().length < 3}
                onClick={() => void commit()}
              >
                {busy ? "Processant…" : `Importar ${plan.count} projectes`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Projectes vinculats ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Projecte</th>
                  <th className="p-2">Equip</th>
                  <th className="p-2">Repte</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.url} className="border-t">
                    <td className="p-2">
                      <a
                        className="underline"
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.title} ↗
                      </a>
                    </td>
                    <td className="p-2">
                      {teams.find((t) => t.id === p.group_id)?.name ||
                        p.group_id}
                    </td>
                    <td className="p-2">
                      {p.challenge}
                      {p.mlh && " + MLH"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!projects.length && (
            <p className="text-sm">Encara no s’ha importat cap projecte.</p>
          )}
        </CardContent>
      </Card>
      <details className="rounded border p-4">
        <summary>Codis d’equip per al formulari de Devpost</summary>
        <ul className="mt-3 space-y-2 text-sm">
          {teams.map((t) => (
            <li key={t.id}>
              {t.name}: <code>{t.code || "—"}</code>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
