import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Copy, Check, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { ConfirmDialog, EmptyBox, ErrorBox, Loading } from "@/components/shared";
import {
  request,
  errorMessage,
  type Meal,
  type Participant,
  type HackerProfile,
} from "@/lib/api";

// The backend returns these endpoints as untyped dicts/lists, so render whatever
// shape comes back generically instead of hard-coding fields that may drift.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function humanize(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
function Primitive({ value }: { value: unknown }) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return <span>{value ? "Sí" : "No"}</span>;
  return <span className="tabular-nums">{String(value)}</span>;
}
export function DataView({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    if (!data.length)
      return <p className="text-sm text-muted-foreground">Sense dades.</p>;
    if (data.every((x) => !isPlainObject(x) && !Array.isArray(x)))
      return (
        <div className="flex flex-wrap gap-2">
          {data.map((x, i) => (
            <Badge key={i} variant="secondary">
              {String(x)}
            </Badge>
          ))}
        </div>
      );
    return (
      <div className="flex flex-col gap-3">
        {data.map((x, i) => (
          <div key={i} className="rounded-md border p-4">
            <DataView data={x} />
          </div>
        ))}
      </div>
    );
  }
  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    if (!entries.length)
      return <p className="text-sm text-muted-foreground">Sense dades.</p>;
    return (
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([k, v]) => (
          <div key={k} className="rounded-md border p-4">
            <dt className="text-sm text-muted-foreground">{humanize(k)}</dt>
            <dd className="mt-1 text-lg">
              {isPlainObject(v) || Array.isArray(v) ? (
                <DataView data={v} />
              ) : (
                <Primitive value={v} />
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <Primitive value={data} />;
}

function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await request<T>(path));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, loading, error, reload: load };
}

function Section({
  title,
  description,
  loading,
  error,
  onReload,
  children,
}: {
  title: string;
  description?: string;
  loading: boolean;
  error: string;
  onReload: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Actualitzar ${title}`}
          onClick={onReload}
          disabled={loading}
        >
          <RefreshCw />
        </Button>
      </CardHeader>
      <CardContent>
        <ErrorBox error={error} />
        {loading ? <Loading /> : children}
      </CardContent>
    </Card>
  );
}

export function StatisticsTab({ id }: { id: number }) {
  const stats = useResource<unknown>(`/v1/event/${id}/statistics`);
  const unregistered = useResource<unknown>(
    `/v1/event/${id}/count_unregistered_hackers/`,
  );
  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Estadístiques de l'esdeveniment"
        description="Dades agregades calculades al servidor."
        loading={stats.loading}
        error={stats.error}
        onReload={stats.reload}
      >
        {stats.data === undefined || stats.data === null ? (
          <EmptyBox title="Sense estadístiques" />
        ) : (
          <DataView data={stats.data} />
        )}
      </Section>
      <Section
        title="Participants sense registrar"
        description="Acceptats que encara no han completat el registre."
        loading={unregistered.loading}
        error={unregistered.error}
        onReload={unregistered.reload}
      >
        <p className="text-4xl font-normal tabular-nums">
          <Primitive value={unregistered.data} />
        </p>
      </Section>
    </div>
  );
}

export function LogisticsTab({ id }: { id: number }) {
  const sizes = useResource<unknown>(`/v1/event/${id}/get_sizes`);
  const food = useResource<unknown>(`/v1/event/${id}/food_restrictions`);
  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Talles de samarreta"
        description="Recompte de talles per preparar el material."
        loading={sizes.loading}
        error={sizes.error}
        onReload={sizes.reload}
      >
        {sizes.data === undefined ? (
          <EmptyBox title="Sense dades de talles" />
        ) : (
          <DataView data={sizes.data} />
        )}
      </Section>
      <Section
        title="Restriccions alimentàries"
        description="Necessitats a tenir en compte per al càtering."
        loading={food.loading}
        error={food.error}
        onReload={food.reload}
      >
        {food.data === undefined ? (
          <EmptyBox title="Sense restriccions registrades" />
        ) : (
          <DataView data={food.data} />
        )}
      </Section>
    </div>
  );
}

function extractMails(data: unknown): string[] {
  if (Array.isArray(data))
    return data
      .map((x) =>
        typeof x === "string"
          ? x
          : isPlainObject(x)
            ? String(x.email ?? x.mail ?? "")
            : "",
      )
      .filter(Boolean);
  if (isPlainObject(data)) {
    const list = Object.values(data).find((v) => Array.isArray(v));
    if (list) return extractMails(list);
  }
  return [];
}

export function AcceptedMailsCard({ id }: { id: number }) {
  const [mails, setMails] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await request<unknown>(
        `/v1/event/${id}/get_approved_hackers_mails`,
      );
      setMails(extractMails(data));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  async function copy() {
    if (!mails?.length) return;
    try {
      await navigator.clipboard.writeText(mails.join(", "));
      setCopied(true);
      toast.success("Correus copiats");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No s'han pogut copiar els correus.");
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Correus dels participants acceptats</CardTitle>
        <CardDescription>
          Exporta les adreces per enviar comunicacions des d&apos;una altra eina.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ErrorBox error={error} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "Carregant…" : "Carregar correus"}
          </Button>
          {mails && mails.length > 0 && (
            <Button variant="outline" onClick={() => void copy()}>
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              Copiar {mails.length}
            </Button>
          )}
        </div>
        {mails && mails.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Encara no hi ha correus d&apos;acceptats per exportar.
          </p>
        )}
        {mails && mails.length > 0 && (
          <Textarea
            readOnly
            aria-label="Correus dels acceptats"
            className="font-mono text-xs"
            rows={Math.min(8, mails.length + 1)}
            value={mails.join("\n")}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function MailActions({ id }: { id: number }) {
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);
  const actions = [
    {
      label: "Enviar recordatoris",
      title: "Enviar correus de recordatori",
      description:
        "S'enviarà un correu de recordatori als participants de l'esdeveniment. Aquesta acció envia correus reals.",
      path: `/v1/event/${id}/send_reminder_mails/`,
      method: "POST" as const,
    },
    {
      label: "Reenviar correus d'acceptació",
      title: "Reenviar correus d'acceptació",
      description:
        "Es tornarà a enviar el correu d'acceptació als participants acceptats. Aquesta acció envia correus reals.",
      path: `/v1/event/${id}/resend-accepted-mails`,
      method: "GET" as const,
    },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comunicacions per correu</CardTitle>
        <CardDescription>
          Accions que envien correus reals als participants. Confirma abans de
          continuar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            onClick={() =>
              setConfirmation({
                title: a.title,
                description: a.description,
                run: async () => {
                  await request(a.path, a.method);
                },
              })
            }
          >
            {a.label}
          </Button>
        ))}
      </CardContent>
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          onConfirm={confirmation.run}
          onClose={() => setConfirmation(null)}
        />
      )}
    </Card>
  );
}

function isUrl(v: string) {
  return /^https?:\/\//i.test(v.trim());
}
function LinkOrText({ value }: { value: string }) {
  return isUrl(value) ? (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="text-link underline underline-offset-2"
    >
      {value}
      <ExternalLink className="ml-1 inline size-3" />
    </a>
  ) : (
    <span className="break-words">{value}</span>
  );
}

const detailFields: { key: keyof HackerProfile; label: string; link?: boolean }[] =
  [
    { key: "studies", label: "Estudis" },
    { key: "study_center", label: "Centre d'estudis" },
    { key: "location", label: "Ubicació" },
    { key: "food_restrictions", label: "Restriccions alimentàries" },
    { key: "shirt_size", label: "Talla de samarreta" },
    { key: "how_did_you_meet_us", label: "Com ens va conèixer" },
    { key: "telephone", label: "Telèfon" },
    { key: "github", label: "GitHub", link: true },
    { key: "linkedin", label: "LinkedIn", link: true },
  ];

// Shows the CV, the experience text and the full profile for a participant, so
// acceptances can be decided without leaving the panel. Profile is fetched from
// GET /v1/hacker/{id}; the experience text comes from the registration row when
// the backend includes it.
export function ParticipantDetailDialog({
  eventId,
  participant,
  onClose,
}: {
  eventId: number;
  participant: Participant;
  onClose: () => void;
}) {
  const [data, setData] = useState<HackerProfile>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      // Prefer the per-event registration: it carries the CV and the experience
      // text the participant submitted for THIS event. Fall back to the hacker
      // profile on backends that don't expose the registration endpoint yet.
      try {
        const reg = await request<HackerProfile>(
          `/v1/event/${eventId}/registration/${participant.id}`,
        );
        if (active) setData(reg);
      } catch {
        try {
          const profile = await request<HackerProfile>(
            `/v1/hacker/${participant.id}`,
          );
          if (active) setData(profile);
        } catch (e) {
          if (active) setError(errorMessage(e));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId, participant.id]);

  const experience = participant.description ?? data?.description ?? "";
  const cv = participant.cv ?? data?.cv ?? "";
  const present = detailFields
    .map((f) => ({ ...f, value: data?.[f.key] }))
    .filter((f) => f.value != null && String(f.value).trim() !== "");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{participant.name}</DialogTitle>
          <DialogDescription>
            {participant.email}
            {participant.nickname ? ` · ${participant.nickname}` : ""}
          </DialogDescription>
        </DialogHeader>
        <ErrorBox error={error} />
        <div className="flex flex-col gap-5">
          {cv.trim() ? (
            <Button variant="outline" asChild className="self-start">
              {isUrl(cv) ? (
                <a href={cv} target="_blank" rel="noreferrer">
                  <FileText data-icon="inline-start" />
                  Veure el CV
                  <ExternalLink data-icon="inline-end" />
                </a>
              ) : (
                <span>
                  <FileText data-icon="inline-start" />
                  CV: {cv}
                </span>
              )}
            </Button>
          ) : (
            !loading && (
              <p className="text-sm text-muted-foreground">
                Aquest participant no ha penjat cap CV.
              </p>
            )
          )}
          <div>
            <p className="text-sm font-medium">Experiència</p>
            {experience.trim() ? (
              <p className="mt-1 whitespace-pre-wrap text-sm">{experience}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Sense text d&apos;experiència.
              </p>
            )}
          </div>
          {loading ? (
            <Loading />
          ) : present.length ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {present.map((f) => (
                <div key={f.key}>
                  <dt className="text-sm text-muted-foreground">{f.label}</dt>
                  <dd className="mt-0.5 text-sm">
                    {f.link ? (
                      <LinkOrText value={String(f.value)} />
                    ) : (
                      String(f.value)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            !error && (
              <p className="text-sm text-muted-foreground">
                No hi ha més dades de perfil disponibles.
              </p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MealCheckIn({ meals }: { meals: Meal[] }) {
  const [mealId, setMealId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!meals.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar un àpat per codi</CardTitle>
        <CardDescription>
          Marca que un participant ha recollit un àpat introduint el seu codi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!mealId || !code.trim()) return;
            setBusy(true);
            setError("");
            try {
              await request(
                `/v1/meal/${mealId}/eat/${encodeURIComponent(code.trim())}`,
                "PUT",
              );
              toast.success("Àpat registrat");
              setCode("");
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field className="w-auto">
            <FieldLabel htmlFor="meal-eat-select">Àpat</FieldLabel>
            <NativeSelect
              id="meal-eat-select"
              value={mealId}
              onChange={(e) => setMealId(e.target.value)}
              required
            >
              <NativeSelectOption value="">Selecciona un àpat</NativeSelectOption>
              {meals.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="meal-eat-code">Codi del participant</FieldLabel>
            <Input
              id="meal-eat-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </Field>
          <Button disabled={busy || !mealId || !code.trim()}>
            Registrar àpat
          </Button>
        </form>
        <div className="mt-3">
          <ErrorBox error={error} />
        </div>
      </CardContent>
    </Card>
  );
}
