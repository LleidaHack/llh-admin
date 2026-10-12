import { TeamMemberDialog } from "./user-profile";
import { useParticipantDetails } from "./use-participant-details";
import { searchIndex, searchItems } from "@/lib/search";
import { SearchPagination, PAGE_SIZE } from "@/components/search-pagination";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Pencil,
  Plus,
  RefreshCw,
  MoreHorizontal,
  Download,
  StickyNote,
  Send,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  ConfirmDialog,
  EditDialog,
  ErrorBox,
  EmptyBox,
  Loading,
} from "@/components/shared";
import { EventEditor } from "./events";
import {
  StatisticsTab,
  LogisticsTab,
  AcceptedMailsCard,
  MailActions,
  MealCheckIn,
  ParticipantDetailDialog,
} from "./event-insights";
import { TicketsCard, VouchersCard } from "./event-checkin";
import { AuditLogTab } from "./event-audit";
import { toCsv, downloadCsv } from "@/lib/csv";
import {
  request,
  errorMessage,
  fetchCvUrl,
  type EventRecord,
  type Participant,
  type Company,
  type Meal,
  type Team,
} from "@/lib/api";
import { dateLabel, serverDate } from "@/lib/events";
import { cn } from "@/lib/utils";
// Sponsor tiers shared with the HackEPS frontend: 0 = highest.
const TIERS = [
  { value: 0, label: "Supreme" },
  { value: 1, label: "Challenger" },
  { value: 2, label: "Premium" },
  { value: 3, label: "Supporter" },
  { value: 4, label: "Inferior" },
];
const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  rejected: 2,
};
const STATUS_LABELS: Record<string, string> = {
  accepted: "Acceptat",
  pending: "Pendent",
  rejected: "Rebutjat",
};
const NO_CENTER = "__none__";
// Extra status filters for accepted participants and their mail confirmation.
const CONFIRMATION_FILTERS: Record<string, string> = {
  "accepted-confirmed": "Acceptats · confirmats",
  "accepted-unconfirmed": "Acceptats · sense confirmar",
};
function matchesStatus(p: Participant, filter: string) {
  if (filter === "accepted-confirmed")
    return p.status === "accepted" && !!p.confirmed_assistance;
  if (filter === "accepted-unconfirmed")
    return p.status === "accepted" && !p.confirmed_assistance;
  return !filter || p.status === filter;
}
const SORTS = {
  oldest: "Ordre d'inscripció (més antics primer)",
  newest: "Ordre d'inscripció (més recents primer)",
  name: "Nom (A–Z)",
  "name-desc": "Nom (Z–A)",
  status: "Estat (pendents primer)",
  email: "Correu electrònic",
} as const;
type ParticipantSort = keyof typeof SORTS;
const byName = new Intl.Collator("ca", { sensitivity: "base" }).compare;
// The server list follows registration order, so its index breaks ties and
// orders registrations made before registered_at was recorded.
function sortParticipants(list: Participant[], sort: ParticipantSort) {
  const ranked = list.map((p, index) => ({ p, index }));
  const time = (p: Participant) =>
    p.registered_at ? serverDate(p.registered_at).getTime() : -Infinity;
  const compare = {
    oldest: (a: Participant, b: Participant) => time(a) - time(b) || 0,
    newest: (a: Participant, b: Participant) => time(b) - time(a) || 0,
    name: (a: Participant, b: Participant) => byName(a.name, b.name),
    "name-desc": (a: Participant, b: Participant) => byName(b.name, a.name),
    status: (a: Participant, b: Participant) =>
      (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3),
    email: (a: Participant, b: Participant) => byName(a.email, b.email),
  }[sort];
  return ranked
    .sort(
      (a, b) =>
        compare(a.p, b.p) ||
        (sort === "newest" ? b.index - a.index : a.index - b.index),
    )
    .map(({ p }) => p);
}

export function EventDetail({
  id,
  onBack,
  reloadEvents,
}: {
  id: number;
  onBack: () => void;
  reloadEvents: () => Promise<void>;
}) {
  const [event, setEvent] = useState<EventRecord>(),
    [participants, setParticipants] = useState<Participant[]>([]),
    [teams, setTeams] = useState<Team[]>([]),
    [sponsors, setSponsors] = useState<Company[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [mealEditor, setMealEditor] = useState<Meal | "new" | null>(null),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState<ParticipantSort>("oldest"),
    [statusFilter, setStatusFilter] = useState(""),
    [centerFilter, setCenterFilter] = useState(""),
    [selected, setSelected] = useState<Set<number>>(new Set()),
    [auditVersion, setAuditVersion] = useState(0),
    [companyId, setCompanyId] = useState(""),
    [detail, setDetail] = useState<Participant | null>(null),
    [teamMember, setTeamMember] = useState<Team["members"][number] | null>(
      null,
    ),
    [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [mailFor, setMailFor] = useState<Participant | null>(null);
  const load = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        request<EventRecord>(`/v1/event/${id}`),
        request<{ participants: Participant[] }>(
          `/v1/event/${id}/hackers_participants_list`,
        ),
        request<{ groups: Team[] }>(`/v1/event/${id}/groups`),
        request<Company[]>(`/v1/event/${id}/sponsors`),
        request<Meal[]>(`/v1/event/${id}/meals`),
        request<Company[]>("/v1/company/all"),
      ]);
      setError("");
      const [e, p, g, s, m, c] = results;
      if (e.status === "fulfilled") setEvent(e.value);
      if (p.status === "fulfilled") setParticipants(p.value.participants);
      setAuditVersion((v) => v + 1);
      if (g.status === "fulfilled") setTeams(g.value.groups);
      if (s.status === "fulfilled") setSponsors(s.value);
      if (m.status === "fulfilled") setMeals(m.value);
      if (c.status === "fulfilled") setCompanies(c.value);
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length) throw (failed[0] as PromiseRejectedResult).reason;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(path: string, method = "PUT", body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await request(path, method, body);
      await load();
      await reloadEvents();
      toast.success("Canvis desats");
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function openCv(hackerId: number) {
    try {
      const url = await fetchCvUrl(hackerId);
      setCvUrl(url); // mostra el PDF en un modal inline (evita el bloqueig de popups)
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  function closeCv() {
    if (cvUrl) URL.revokeObjectURL(cvUrl);
    setCvUrl(null);
  }
  async function resendMail(
    kind: "accepted" | "reset" | "verify",
    p: Participant,
  ) {
    try {
      if (kind === "accepted")
        await request(`/v1/event/${id}/resend-accepted-mail/${p.id}/`, "GET");
      else if (kind === "reset")
        await request(
          `/v1/auth/reset-password?email=${encodeURIComponent(p.email)}`,
          "POST",
        );
      else
        await request(
          `/v1/auth/resend-verification?email=${encodeURIComponent(p.email)}`,
          "POST",
        );
      toast.success("Correu reenviat");
      setMailFor(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const confirm = (title: string, path: string, method = "PUT") =>
    setConfirmation({
      title,
      description: "Aquest canvi s'aplicarà a l'esdeveniment seleccionat.",
      run: async () => {
        await request(path, method);
        await load();
      },
    });
  const index = useMemo(
    () =>
      searchIndex(
        participants,
        (p) => `${p.name} ${p.email} ${p.nickname || ""}`,
      ),
    [participants],
  );
  const centers = useMemo(
    () =>
      [
        ...new Set(
          participants
            .map((p) => p.study_center?.trim())
            .filter((c): c is string => !!c),
        ),
      ].sort(byName),
    [participants],
  );
  const filtered = useMemo(
    () =>
      sortParticipants(
        searchItems(index, query).filter(
          (p) =>
            matchesStatus(p, statusFilter) &&
            (!centerFilter ||
              (centerFilter === NO_CENTER
                ? !p.study_center?.trim()
                : p.study_center?.trim() === centerFilter)),
        ),
        sort,
      ),
    [index, query, sort, statusFilter, centerFilter],
  );
  const selectedParticipants = participants.filter((p) => selected.has(p.id));
  function bulk(kind: "accept" | "reject") {
    const targets = selectedParticipants.filter((p) =>
      kind === "accept" ? p.status !== "accepted" : p.status === "pending",
    );
    if (!targets.length) {
      toast.error(
        kind === "accept"
          ? "Tots els seleccionats ja estan acceptats."
          : "Només es poden rebutjar inscripcions pendents.",
      );
      return;
    }
    setConfirmation({
      title: `${kind === "accept" ? "Acceptar" : "Rebutjar"} ${targets.length} ${targets.length === 1 ? "inscripció" : "inscripcions"}`,
      description:
        kind === "accept"
          ? "Cada participant rebrà el correu d'acceptació."
          : "Les inscripcions seleccionades passaran a rebutjades.",
      run: async () => {
        const failed: string[] = [];
        // One by one: each acceptance sends a mail and checks capacity.
        for (const p of targets) {
          try {
            await request(`/v1/event/${id}/${kind}/${p.id}`, "PUT");
          } catch (e) {
            failed.push(`${p.name}: ${errorMessage(e)}`);
          }
        }
        setSelected(new Set());
        await load();
        if (failed.length)
          throw new Error(
            `${targets.length - failed.length} fets, ${failed.length} amb error. ${failed.join(" · ")}`,
          );
      },
    });
  }
  const unconfirmed = participants.filter(
    (p) => p.status === "accepted" && p.confirmed_assistance === false,
  );
  const confirmedCount = participants.filter(
    (p) => p.status === "accepted" && p.confirmed_assistance,
  ).length;
  function resendUnconfirmed() {
    setConfirmation({
      title: `Reenviar el correu a ${unconfirmed.length} ${unconfirmed.length === 1 ? "participant" : "participants"}`,
      description:
        "Rebran de nou el correu d'acceptació, amb un enllaç nou per confirmar l'assistència, els acceptats que encara no han confirmat.",
      run: async () => {
        const result = await request<{ sent?: number }>(
          `/v1/event/${id}/resend-accepted-mails?only_unconfirmed=true`,
        );
        toast.success(`Correus enviats: ${result.sent ?? unconfirmed.length}`);
        await load();
      },
    });
  }
  function exportCsv() {
    const rows = filtered.map((p) => [
      p.id,
      p.name,
      p.email,
      STATUS_LABELS[p.status] || p.status,
      p.status === "accepted" ? (p.confirmed_assistance ? "Sí" : "No") : "",
      p.study_center,
      p.registered_at,
      p.cv?.trim() ? "Sí" : "No",
      p.notes_count ?? 0,
    ]);
    downloadCsv(
      `inscripcions-${event?.name ?? id}.csv`.replace(/[^\w.-]+/g, "_"),
      toCsv([
        [
          "ID",
          "Nom",
          "Correu",
          "Estat",
          "Assistència confirmada",
          "Centre d'estudis",
          "Data d'inscripció",
          "CV",
          "Notes",
        ],
        ...rows,
      ]),
    );
  }
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
  const visible = useMemo(
    () =>
      filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage],
  );
  const visibleParticipants = useParticipantDetails(id, visible);
  if (loading) return <Loading />;
  if (!event)
    return (
      <>
        <ErrorBox error={error} />
        <Button variant="outline" onClick={onBack}>
          Tornar als esdeveniments
        </Button>
      </>
    );
  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" className="self-start" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />
        Tots els esdeveniments
      </Button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">GESTIÓ DE L'ESDEVENIMENT / {event.id}</p>
          <h1>{event.name}</h1>
          <p className="text-muted-foreground">
            {event.location} · {dateLabel(event.start_date)} —{" "}
            {dateLabel(event.end_date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void load()}
            aria-label="Actualitzar l'esdeveniment"
          >
            <RefreshCw />
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil data-icon="inline-start" />
            Editar l'esdeveniment
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void action(`/v1/event/${id}`, "PUT", { is_open: !event.is_open })
            }
          >
            {event.is_open ? "Tancar inscripcions" : "Obrir inscripcions"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={event.is_open ? "default" : "secondary"}>
          {event.is_open ? "Inscripcions obertes" : "Inscripcions tancades"}
        </Badge>
        <Badge variant="outline">{event.max_participants} places</Badge>
        <Badge variant="outline">{participants.length} inscrits</Badge>
        {participants.some((p) => p.confirmed_assistance !== undefined) && (
          <Badge variant="outline">
            {confirmedCount} confirmats · {unconfirmed.length} sense confirmar
          </Badge>
        )}
      </div>
      <ErrorBox error={error} />
      <Tabs defaultValue="participants">
        <TabsList className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="participants">
            Inscripcions ({participants.length})
          </TabsTrigger>
          <TabsTrigger value="teams">Equips ({teams.length})</TabsTrigger>
          <TabsTrigger value="sponsors">
            Patrocinadors ({sponsors.length})
          </TabsTrigger>
          <TabsTrigger value="meals">Àpats ({meals.length})</TabsTrigger>
          <TabsTrigger value="checkin">Assistència</TabsTrigger>
          <TabsTrigger value="comms">Comunicacions</TabsTrigger>
          <TabsTrigger value="statistics">Estadístiques</TabsTrigger>
          <TabsTrigger value="logistics">Logística</TabsTrigger>
          <TabsTrigger value="audit">Historial</TabsTrigger>
          <TabsTrigger value="settings">Informació</TabsTrigger>
        </TabsList>
        <TabsContent value="participants" className="flex flex-col gap-4 pt-4">
          <div className="page-heading">
            <div>
              <h2>Inscripcions</h2>
              <p className="text-sm text-muted-foreground">
                Revisa les sol·licituds i decideix qui participa.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <NativeSelect
                aria-label="Ordenar les inscripcions"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as ParticipantSort);
                  setPage(0);
                }}
              >
                {Object.entries(SORTS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                aria-label="Filtrar per estat"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <NativeSelectOption value="">
                  Tots els estats
                </NativeSelectOption>
                {Object.entries({
                  ...STATUS_LABELS,
                  ...CONFIRMATION_FILTERS,
                }).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                aria-label="Filtrar per centre d'estudis"
                value={centerFilter}
                onChange={(e) => {
                  setCenterFilter(e.target.value);
                  setPage(0);
                }}
              >
                <NativeSelectOption value="">
                  Tots els centres
                </NativeSelectOption>
                <NativeSelectOption value={NO_CENTER}>
                  Sense centre
                </NativeSelectOption>
                {centers.map((center) => (
                  <NativeSelectOption key={center} value={center}>
                    {center}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                aria-label="Cercar participants"
                placeholder="Cercar per nom, correu o àlies…"
                className="sm:max-w-xs"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
              <Button
                variant="outline"
                disabled={!unconfirmed.length || busy}
                onClick={resendUnconfirmed}
              >
                <Send data-icon="inline-start" />
                Reenviar als no confirmats ({unconfirmed.length})
              </Button>
              <Button
                variant="outline"
                disabled={!filtered.length}
                onClick={exportCsv}
              >
                <Download data-icon="inline-start" />
                CSV
              </Button>
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded border p-3">
              <span className="text-sm">
                {selected.size}{" "}
                {selected.size === 1 ? "seleccionat" : "seleccionats"}
              </span>
              <Button size="sm" disabled={busy} onClick={() => bulk("accept")}>
                Acceptar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => bulk("reject")}
              >
                Rebutjar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                Treure la selecció
              </Button>
            </div>
          )}
          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar tots els resultats filtrats"
                      checked={
                        filtered.length > 0 &&
                        filtered.every((p) => selected.has(p.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? new Set(filtered.map((p) => p.id))
                            : new Set(),
                        )
                      }
                    />
                  </TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Correu electrònic</TableHead>
                  <TableHead>Inscripció</TableHead>
                  <TableHead>Universitat</TableHead>
                  <TableHead>Estat</TableHead>
                  <TableHead className="text-right">Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleParticipants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${p.name}`}
                        checked={selected.has(p.id)}
                        onChange={(e) =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (e.target.checked) next.add(p.id);
                            else next.delete(p.id);
                            return next;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        {p.name}
                        {!!p.notes_count && (
                          <span
                            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
                            title={`${p.notes_count} ${p.notes_count === 1 ? "nota interna" : "notes internes"}`}
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                            {p.notes_count}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      {p.registered_at
                        ? dateLabel(serverDate(p.registered_at).toISOString())
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {p.detailsLoading ? (
                        "Carregant…"
                      ) : p.detailsError ? (
                        <span title={p.detailsError}>No disponible</span>
                      ) : (
                        p.study_center?.trim() || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "accepted" ? "default" : "secondary"
                        }
                      >
                        {STATUS_LABELS[p.status] || "Desconegut"}
                      </Badge>
                      {p.status === "accepted" &&
                        p.confirmed_assistance !== undefined && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "ml-1.5",
                              p.confirmed_assistance &&
                                "border-transparent bg-[var(--success)] text-black",
                            )}
                            title={
                              p.confirmed_assistance
                                ? "Ha confirmat l'assistència des del correu"
                                : "Encara no ha confirmat l'assistència"
                            }
                          >
                            {p.confirmed_assistance
                              ? "Confirmat"
                              : "Sense confirmar"}
                          </Badge>
                        )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetail(p)}
                        >
                          Detalls
                        </Button>
                        {p.cv?.trim() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCv(p.id)}
                          >
                            CV
                          </Button>
                        )}
                        {p.status !== "accepted" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              confirm(
                                `Acceptar ${p.name}`,
                                `/v1/event/${id}/accept/${p.id}`,
                              )
                            }
                          >
                            Acceptar
                          </Button>
                        )}
                        {p.status === "accepted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              confirm(
                                `Retirar l'acceptació de ${p.name}`,
                                `/v1/event/${id}/unaccept/${p.id}`,
                              )
                            }
                          >
                            Retirar l'acceptació
                          </Button>
                        )}
                        {p.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              confirm(
                                `Rebutjar ${p.name}`,
                                `/v1/event/${id}/reject/${p.id}`,
                              )
                            }
                          >
                            Rebutjar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMailFor(p)}
                          aria-label="Més accions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyBox title="No hi ha inscripcions per mostrar">
              Les sol·licituds dels participants apareixeran aquí.
            </EmptyBox>
          )}
          {visibleParticipants.some((p) => p.detailsError) && (
            <ErrorBox error="No s'han pogut carregar alguns CV o universitats. Torna a carregar l'esdeveniment per reintentar-ho." />
          )}
          <SearchPagination
            page={currentPage}
            total={filtered.length}
            onChange={setPage}
          />
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <AuditLogTab
            eventId={id}
            participants={participants}
            version={auditVersion}
          />
        </TabsContent>
        <TabsContent value="teams" className="flex flex-col gap-4 pt-4">
          <h2>Equips inscrits</h2>
          <p className="text-sm text-muted-foreground">
            El rebuig de l'equip només afecta els membres no acceptats. Per
            canviar una acceptació, retira-la primer a Inscripcions.
          </p>
          {teams.length ? (
            teams.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle>{g.name}</CardTitle>
                  <CardDescription>{g.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <p className="leading-relaxed">
                    {g.members.length ? (
                      g.members.map((m, i) => {
                        const norm = (s?: string) =>
                          (s || "").trim().replace(/\s+/g, " ").toLowerCase();
                        const byIdentity = participants.find((p) =>
                          m.id != null
                            ? p.id === m.id
                            : p.nickname === m.nickname,
                        );
                        const byName = participants.filter(
                          (p) => norm(p.name) === norm(m.name),
                        );
                        const accepted =
                          (
                            byIdentity ||
                            (byName.length === 1 ? byName[0] : undefined)
                          )?.status === "accepted";
                        return (
                          <span key={m.id ?? m.nickname}>
                            {i > 0 && ", "}
                            <button
                              type="button"
                              className={`cursor-pointer rounded-sm font-medium underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 ${accepted ? "text-green-600" : "text-red-600"}`}
                              title={accepted ? "Acceptat" : "No acceptat"}
                              aria-label={`Veure la fitxa de ${m.name}`}
                              onClick={() => setTeamMember(m)}
                            >
                              {m.name}
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span>Sense membres</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        confirm(
                          `Acceptar l'equip ${g.name}`,
                          `/v1/event/${id}/acceptgroup/${g.id}`,
                        )
                      }
                    >
                      Acceptar l'equip
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        confirm(
                          `Rebutjar l'equip ${g.name}`,
                          `/v1/event/${id}/rejectgroup/${g.id}`,
                        )
                      }
                    >
                      Rebutjar pendents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyBox title="Encara no hi ha equips" />
          )}
        </TabsContent>
        <TabsContent value="sponsors" className="flex flex-col gap-4 pt-4">
          <h2>Patrocinadors de l'esdeveniment</h2>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (companyId)
                void action(`/v1/event/${id}/sponsors/${companyId}`).then(
                  (saved) => {
                    if (saved) setCompanyId("");
                  },
                );
            }}
          >
            <Field className="w-auto">
              <FieldLabel htmlFor="company-select">
                Afegir una empresa existent
              </FieldLabel>
              <NativeSelect
                id="company-select"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                <NativeSelectOption value="">
                  Selecciona una empresa
                </NativeSelectOption>
                {companies
                  .filter((c) => !sponsors.some((s) => s.id === c.id))
                  .map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </Field>
            <Button disabled={busy || !companyId}>Vincular patrocinador</Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Pots crear empreses noves a la secció Empreses del menú.
          </p>
          {sponsors.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Nivell</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.map((c, index) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      <NativeSelect
                        aria-label={`Nivell de ${c.name}`}
                        value={String(c.tier ?? 0)}
                        disabled={busy}
                        onChange={(e) =>
                          void action(
                            `/v1/event/${id}/sponsors/${c.id}`,
                            "PATCH",
                            {
                              tier: Number(e.target.value),
                              display_order: index,
                            },
                          )
                        }
                      >
                        {TIERS.map((t) => (
                          <NativeSelectOption
                            key={t.value}
                            value={String(t.value)}
                          >
                            {t.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell>
                      <Input
                        key={`order-${c.id}-${index}`}
                        type="number"
                        min={0}
                        className="w-20"
                        aria-label={`Ordre de ${c.name}`}
                        defaultValue={index}
                        disabled={busy}
                        onBlur={(e) => {
                          const order = Number(e.target.value);
                          if (order !== index)
                            void action(
                              `/v1/event/${id}/sponsors/${c.id}`,
                              "PATCH",
                              { tier: c.tier ?? 0, display_order: order },
                            );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          confirm(
                            `Desvincular ${c.name}`,
                            `/v1/event/${id}/sponsors/${c.id}`,
                            "DELETE",
                          )
                        }
                      >
                        Desvincular
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyBox title="Sense patrocinadors vinculats" />
          )}
        </TabsContent>
        <TabsContent value="meals" className="flex flex-col gap-4 pt-4">
          <div className="page-heading">
            <h2>Àpats</h2>
            <Button onClick={() => setMealEditor("new")}>
              <Plus data-icon="inline-start" />
              Crear àpat
            </Button>
          </div>
          {meals.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Descripció</TableHead>
                  <TableHead>Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMealEditor(m)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            confirm(
                              `Eliminar ${m.name}`,
                              `/v1/meal/${m.id}`,
                              "DELETE",
                            )
                          }
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyBox title="Planifica els àpats d'aquesta edició" />
          )}
          <MealCheckIn meals={meals} />
        </TabsContent>
        <TabsContent value="checkin" className="flex flex-col gap-5 pt-4">
          <VouchersCard id={id} />
          <Card>
            <CardHeader>
              <CardTitle>Registrar l'arribada</CardTitle>
              <CardDescription>
                Introdueix el codi d'un participant acceptat per registrar-ne
                l'assistència.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-4 sm:max-w-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(
                    `/v1/event/${id}/participate/${encodeURIComponent(code)}`,
                  );
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="checkin-code">
                      Codi del participant
                    </FieldLabel>
                    <Input
                      id="checkin-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </Field>
                </FieldGroup>
                <Button disabled={busy || !code.trim()}>
                  Registrar l'arribada
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comms" className="flex flex-col gap-5 pt-4">
          <h2>Comunicacions</h2>
          <p className="text-sm text-muted-foreground">
            Exporta correus i envia comunicacions als participants d&apos;aquest
            esdeveniment.
          </p>
          <TicketsCard id={id} />
          <AcceptedMailsCard id={id} />
          <MailActions id={id} />
        </TabsContent>
        <TabsContent value="statistics" className="pt-4">
          <StatisticsTab id={id} />
        </TabsContent>
        <TabsContent value="logistics" className="pt-4">
          <LogisticsTab id={id} />
        </TabsContent>
        <TabsContent value="settings" className="flex flex-col gap-5 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sobre aquesta edició</CardTitle>
              <CardDescription>
                {event.description || "Sense descripció"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Persones per equip
                  </dt>
                  <dd>{event.max_group_size}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Màxim de patrocinadors
                  </dt>
                  <dd>{event.max_sponsors}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Preu (API)</dt>
                  <dd>{event.price}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Button
            variant="destructive"
            className="self-start"
            onClick={() =>
              setConfirmation({
                title: `Eliminar ${event.name}`,
                description:
                  "S'eliminarà l'esdeveniment. Aquesta acció no es pot desfer i pot fallar si té dades associades.",
                run: async () => {
                  await request(`/v1/event/${id}`, "DELETE");
                  await reloadEvents();
                  onBack();
                },
              })
            }
          >
            Eliminar l'esdeveniment
          </Button>
        </TabsContent>
      </Tabs>
      {editing && (
        <EventEditor
          event={event}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            await load();
            await reloadEvents();
          }}
        />
      )}
      {mealEditor && (
        <EditDialog
          title={mealEditor === "new" ? "Crear àpat" : "Editar l'àpat"}
          description="Configura un àpat per a aquest esdeveniment."
          fields={[
            {
              name: "name",
              label: "Nom",
              required: true,
              value: mealEditor === "new" ? "" : mealEditor.name,
            },
            {
              name: "description",
              label: "Descripció",
              value: mealEditor === "new" ? "" : mealEditor.description,
            },
          ]}
          onClose={() => setMealEditor(null)}
          onSave={async (f) => {
            await request(
              mealEditor === "new"
                ? "/v1/meal/"
                : `/v1/meal/${id}/${mealEditor.id}`,
              mealEditor === "new" ? "POST" : "PUT",
              {
                name: f.get("name"),
                description: f.get("description"),
                ...(mealEditor === "new" ? { event_id: id } : {}),
              },
            );
            await load();
          }}
        />
      )}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          onConfirm={confirmation.run}
          onClose={() => setConfirmation(null)}
        />
      )}
      {teamMember && (
        <TeamMemberDialog
          key={teamMember.id ?? teamMember.nickname}
          member={teamMember}
          onClose={() => setTeamMember(null)}
        />
      )}
      {detail && (
        <ParticipantDetailDialog
          eventId={id}
          participant={detail}
          onClose={() => setDetail(null)}
          onNotesChange={() => void load()}
        />
      )}
      <Dialog open={!!cvUrl} onOpenChange={(o) => !o && closeCv()}>
        <DialogContent className="max-w-none w-[95vw] sm:max-w-none">
          <DialogHeader>
            <DialogTitle>CV</DialogTitle>
          </DialogHeader>
          {cvUrl && (
            <iframe
              src={cvUrl}
              title="CV"
              className="w-full rounded border"
              style={{ height: "88vh" }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!mailFor} onOpenChange={(o) => !o && setMailFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reenviar correu{mailFor ? ` a ${mailFor.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => mailFor && resendMail("accepted", mailFor)}
            >
              Correu d'acceptació
            </Button>
            <Button
              variant="outline"
              onClick={() => mailFor && resendMail("reset", mailFor)}
            >
              Reset de contrasenya
            </Button>
            <Button
              variant="outline"
              onClick={() => mailFor && resendMail("verify", mailFor)}
            >
              Verificació de compte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
