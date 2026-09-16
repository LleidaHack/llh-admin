import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Pencil, Plus, RefreshCw } from "lucide-react";
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
  request,
  errorMessage,
  type EventRecord,
  type Participant,
  type Company,
  type Meal,
  type Team,
} from "@/lib/api";
import { dateLabel } from "@/lib/events";
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
    [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);
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
      toast.success("Cambios guardados");
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const confirm = (title: string, path: string, method = "PUT") =>
    setConfirmation({
      title,
      description: "Este cambio se aplicará al evento seleccionado.",
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
          Volver a eventos
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
        Todos los eventos
      </Button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">GESTIÓN DEL EVENTO / {event.id}</p>
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
            aria-label="Actualizar evento"
          >
            <RefreshCw />
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil data-icon="inline-start" />
            Editar evento
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void action(`/v1/event/${id}`, "PUT", { is_open: !event.is_open })
            }
          >
            {event.is_open ? "Cerrar inscripciones" : "Abrir inscripciones"}
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
        <Badge variant={event.is_open ? "default" : "secondary"}>
          {event.is_open ? "Inscripciones abiertas" : "Inscripciones cerradas"}
        </Badge>
        <Badge variant="outline">{event.max_participants} plazas</Badge>
        <Badge variant="outline">{participants.length} inscritos</Badge>
      </div>
      <ErrorBox error={error} />
      <Tabs defaultValue="participants">
        <TabsList className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="participants">
            Inscripciones ({participants.length})
          </TabsTrigger>
          <TabsTrigger value="teams">Equipos ({teams.length})</TabsTrigger>
          <TabsTrigger value="sponsors">
            Patrocinadores ({sponsors.length})
          </TabsTrigger>
          <TabsTrigger value="meals">Comidas ({meals.length})</TabsTrigger>
          <TabsTrigger value="checkin">Asistencia</TabsTrigger>
          <TabsTrigger value="settings">Información</TabsTrigger>
        </TabsList>
        <TabsContent value="participants" className="flex flex-col gap-4 pt-4">
          <div className="page-heading">
            <div>
              <h2>Inscripciones</h2>
              <p className="text-sm text-muted-foreground">
                Revisa las solicitudes y decide quién participa.
              </p>
            </div>
            <Input
              aria-label="Buscar participantes"
              placeholder="Buscar nombre o email…"
              className="sm:max-w-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
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
                          accepted: "Aceptado",
                          pending: "Pendiente",
                          rejected: "Rechazado",
                        }[p.status] || p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {p.status !== "accepted" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              confirm(
                                `Aceptar a ${p.name}`,
                                `/v1/event/${id}/accept/${p.id}`,
                              )
                            }
                          >
                            Aceptar
                          </Button>
                        )}
                        {p.status === "accepted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              confirm(
                                `Retirar aceptación de ${p.name}`,
                                `/v1/event/${id}/unaccept/${p.id}`,
                              )
                            }
                          >
                            Retirar aceptación
                          </Button>
                        )}
                        {p.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              confirm(
                                `Rechazar a ${p.name}`,
                                `/v1/event/${id}/reject/${p.id}`,
                              )
                            }
                          >
                            Rechazar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyBox title="Sin inscripciones que mostrar">
              Las solicitudes de los participantes aparecerán aquí.
            </EmptyBox>
          )}
        </TabsContent>
        <TabsContent value="teams" className="flex flex-col gap-4 pt-4">
          <h2>Equipos inscritos</h2>
          <p className="text-sm text-muted-foreground">
            El rechazo del equipo afecta solo a miembros no aceptados. Para
            cambiar una aceptación, retírala primero en Inscripciones.
          </p>
          {teams.length ? (
            teams.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle>{g.name}</CardTitle>
                  <CardDescription>{g.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <p>
                    {g.members.map((m) => m.name).join(", ") || "Sin miembros"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        confirm(
                          `Aceptar al equipo ${g.name}`,
                          `/v1/event/${id}/acceptgroup/${g.id}`,
                        )
                      }
                    >
                      Aceptar equipo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        confirm(
                          `Rechazar al equipo ${g.name}`,
                          `/v1/event/${id}/rejectgroup/${g.id}`,
                        )
                      }
                    >
                      Rechazar pendientes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyBox title="Todavía no hay equipos" />
          )}
        </TabsContent>
        <TabsContent value="sponsors" className="flex flex-col gap-4 pt-4">
          <h2>Patrocinadores del evento</h2>
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
                Añadir empresa existente
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
            Puedes crear nuevas empresas en la sección Empresas del menú.
          </p>
          {sponsors.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.tier}</TableCell>
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
            <EmptyBox title="Sin patrocinadores vinculados" />
          )}
        </TabsContent>
        <TabsContent value="meals" className="flex flex-col gap-4 pt-4">
          <div className="page-heading">
            <h2>Comidas</h2>
            <Button onClick={() => setMealEditor("new")}>
              <Plus data-icon="inline-start" />
              Crear comida
            </Button>
          </div>
          {meals.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
            <EmptyBox title="Planifica las comidas de esta edición" />
          )}
        </TabsContent>
        <TabsContent value="checkin" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Registrar llegada</CardTitle>
              <CardDescription>
                Introduce el código de un participante aceptado para registrar
                su asistencia.
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
                      Código del participante
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
                  Registrar llegada
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="flex flex-col gap-5 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Acerca de esta edición</CardTitle>
              <CardDescription>
                {event.description || "Sin descripción"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Personas por equipo
                  </dt>
                  <dd>{event.max_group_size}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Patrocinadores máximos
                  </dt>
                  <dd>{event.max_sponsors}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Precio (API)
                  </dt>
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
                  "Se eliminará el evento. Esta acción no se puede deshacer y puede fallar si tiene datos asociados.",
                run: async () => {
                  await request(`/v1/event/${id}`, "DELETE");
                  await reloadEvents();
                  onBack();
                },
              })
            }
          >
            Eliminar evento
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
          title={mealEditor === "new" ? "Crear comida" : "Editar comida"}
          description="Configura una comida para este evento."
          fields={[
            {
              name: "name",
              label: "Nombre",
              required: true,
              value: mealEditor === "new" ? "" : mealEditor.name,
            },
            {
              name: "description",
              label: "Descripción",
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
    </div>
  );
}
