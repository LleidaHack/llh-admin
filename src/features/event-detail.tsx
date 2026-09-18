import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Pencil, Plus, RefreshCw, MoreHorizontal } from "lucide-react";
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
import { dateLabel } from "@/lib/events";
// Sponsor tiers shared with the HackEPS frontend: 0 = highest.
const TIERS = [
  { value: 0, label: "Supreme" },
  { value: 1, label: "Challenger" },
  { value: 2, label: "Premium" },
  { value: 3, label: "Supporter" },
  { value: 4, label: "Inferior" },
];
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
    [companyId, setCompanyId] = useState(""),
    [detail, setDetail] = useState<Participant | null>(null),
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
  const filtered = participants.filter((p) =>
    `${p.name} ${p.email}`.toLowerCase().includes(query.toLowerCase()),
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
            <Input
              aria-label="Cercar participants"
              placeholder="Cercar per nom o correu…"
              className="sm:max-w-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Correu electrònic</TableHead>
                  <TableHead>Estat</TableHead>
                  <TableHead className="text-right">Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "accepted" ? "default" : "secondary"
                        }
                      >
                        {{
                          accepted: "Acceptat",
                          pending: "Pendent",
                          rejected: "Rebutjat",
                        }[p.status] || "Desconegut"}
                      </Badge>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCv(p.id)}
                        >
                          CV
                        </Button>
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
                  <p className="flex flex-wrap gap-x-2 gap-y-1">
                    {g.members.length ? (
                      g.members.map((m, i) => {
                        const norm = (s?: string) =>
                          (s || "").trim().replace(/\s+/g, " ").toLowerCase();
                        const accepted =
                          participants.find(
                            (p) => norm(p.name) === norm(m.name),
                          )?.status === "accepted";
                        return (
                          <span
                            key={i}
                            className={
                              accepted
                                ? "font-medium text-green-600"
                                : "font-medium text-red-600"
                            }
                            title={accepted ? "Acceptat" : "No acceptat"}
                          >
                            {m.name}
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
      {detail && (
        <ParticipantDetailDialog
          eventId={id}
          participant={detail}
          onClose={() => setDetail(null)}
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
