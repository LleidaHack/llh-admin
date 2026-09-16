import { useState } from "react";
import { Plus, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EditDialog, EmptyBox, type FormField } from "@/components/shared";
import { request, type EventRecord } from "@/lib/api";
import { dateLabel, emptyEvent, eventPayload } from "@/lib/events";
export function EventEditor({
  event,
  onClose,
  onSaved,
}: {
  event?: EventRecord;
  onClose: () => void;
  onSaved: (id: number) => Promise<void>;
}) {
  const data = event || emptyEvent;
  const fields: FormField[] = [
    {
      name: "name",
      label: "Nombre del evento",
      required: true,
      value: data.name,
    },
    {
      name: "location",
      label: "Ubicación",
      required: true,
      value: data.location,
    },
    {
      name: "description",
      label: "Descripción",
      multiline: true,
      value: data.description,
    },
    {
      name: "start_date",
      label: "Inicio",
      type: "datetime-local",
      required: true,
      value: data.start_date.slice(0, 16),
    },
    {
      name: "end_date",
      label: "Fin",
      type: "datetime-local",
      required: true,
      value: data.end_date.slice(0, 16),
    },
    {
      name: "max_participants",
      label: "Plazas",
      type: "number",
      min: 0,
      required: true,
      value: data.max_participants,
    },
    {
      name: "max_group_size",
      label: "Personas por equipo",
      type: "number",
      min: 1,
      required: true,
      value: data.max_group_size,
    },
    {
      name: "max_sponsors",
      label: "Máximo de patrocinadores",
      type: "number",
      min: 0,
      required: true,
      value: data.max_sponsors,
    },
    {
      name: "price",
      label: "Precio (valor entero de la API)",
      type: "number",
      min: 0,
      required: true,
      value: data.price,
    },
  ];
  return (
    <EditDialog
      title={event ? "Editar evento" : "Crear un evento"}
      description="Define los datos de esta edición. Las fechas se guardan tal como las introduces."
      fields={fields}
      onClose={onClose}
      onSave={async (f) => {
        const payload = eventPayload(f, event);
        const result = await request<{ event_id: number }>(
          event ? `/v1/event/${event.id}` : "/v1/event/",
          event ? "PUT" : "POST",
          payload,
        );
        await onSaved(result.event_id);
      }}
    >
      {!event && (
        <p className="text-sm text-muted-foreground">
          El evento se creará con las inscripciones abiertas. Puedes cerrarlas
          desde su ficha.
        </p>
      )}
    </EditDialog>
  );
}
export function Events({
  events,
  onSelect,
  reload,
}: {
  events: EventRecord[];
  onSelect: (id: number) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState(""),
    [create, setCreate] = useState(false);
  const filtered = events.filter((e) =>
    `${e.name} ${e.location}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-7">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TU PRÓXIMA EDICIÓN</p>
          <h1>Eventos</h1>
          <p className="text-muted-foreground">
            Todo lo que necesitas para poner una hackathon en marcha.
          </p>
        </div>
        <Button onClick={() => setCreate(true)}>
          <Plus data-icon="inline-start" />
          Crear evento
        </Button>
      </div>
      <div className="stats-grid">
        {[
          ["Eventos activos", events.length],
          ["Inscripciones abiertas", events.filter((e) => e.is_open).length],
          [
            "Plazas previstas",
            events.reduce((n, e) => n + e.max_participants, 0),
          ],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2>
          Tus eventos{" "}
          <span className="text-muted-foreground">/ {events.length}</span>
        </h2>
        <Input
          aria-label="Buscar eventos"
          placeholder="Buscar por nombre o ubicación…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>
      {filtered.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filtered.map((e) => (
            <Card key={e.id} className="event-card">
              <CardHeader>
                <div className="mb-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    EDICIÓN / {new Date(e.start_date).getFullYear()}
                  </span>
                  <Badge variant={e.is_open ? "default" : "secondary"}>
                    {e.is_open
                      ? "Inscripciones abiertas"
                      : "Inscripciones cerradas"}
                  </Badge>
                </div>
                <CardTitle>{e.name}</CardTitle>
                <CardDescription>
                  {e.description || "Sin descripción"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="flex items-center gap-2 text-sm">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {dateLabel(e.start_date)} — {dateLabel(e.end_date)}
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-muted-foreground" />
                  {e.location}
                </p>
              </CardContent>
              <CardFooter className="justify-between">
                <p className="text-sm text-muted-foreground">
                  {e.max_participants} plazas · Equipos de {e.max_group_size}
                </p>
                <Button variant="outline" onClick={() => onSelect(e.id)}>
                  Gestionar
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyBox
          title={
            query ? "Ningún evento coincide" : "El próximo evento empieza aquí"
          }
        >
          {query
            ? "Prueba con otro nombre."
            : "Crea tu primera edición para gestionar inscripciones, equipos y patrocinadores."}
        </EmptyBox>
      )}
      {create && (
        <EventEditor
          onClose={() => setCreate(false)}
          onSaved={async (id) => {
            await reload();
            onSelect(id);
          }}
        />
      )}
    </div>
  );
}
