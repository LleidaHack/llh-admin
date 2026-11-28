"use client";
import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { request, errorMessage } from "@/lib/api";
import {
  guestCopy,
  guestListPath,
  guestPromotePath,
  guestTicketPath,
  type Guest,
  type GuestKind,
} from "@/lib/guests";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { ErrorBox, EmptyBox } from "@/components/shared";

// Ticket mails are sent in the background; refresh once it has had time to run.
const REFRESH_AFTER_SEND_MS = 2500;

export function EventGuests({
  id,
  kind = "convidat",
}: {
  id: number;
  kind?: GuestKind;
}) {
  const base = `/v1/operations/${id}/guests`;
  const copy = guestCopy[kind];
  const field = `${kind}-${id}`;
  const [items, setItems] = useState<Guest[] | null>(null),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setItems(await request<Guest[]>(guestListPath(id, kind)));
  }, [id, kind]);

  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(errorMessage(e));
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function sendTicket(guest: Guest) {
    await request(guestTicketPath(id, guest, kind), "POST");
    toast.success(`Entrada enviada a ${guest.email}`);
    setTimeout(() => void load().catch(() => {}), REFRESH_AFTER_SEND_MS);
  }

  async function promote(guest: Guest) {
    const result = await request<{ email: string; password_mail: boolean }>(
      guestPromotePath(id, guest),
      "POST",
    );
    if (result.password_mail)
      toast.success(
        `${guest.name} ja és hacker. Hem enviat a ${result.email} un correu per crear la contrasenya.`,
      );
    else
      toast.warning(
        `${guest.name} ja és hacker, però no s'ha pogut enviar el correu. Que restableixi la contrasenya des de la web.`,
      );
  }

  const active = items?.filter((g) => g.active) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.count(active.length)}</CardTitle>
        <CardDescription>
          Crea {copy.singular} amb el nom i el correu i envia-li l’entrada amb
          el rol <strong>{copy.role}</strong>. Inclou el QR i els botons per
          afegir-la a Apple Wallet (iOS) i Google Wallet (Android).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorBox error={error} />
        <form
          className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const created = await request<{
                id: number;
                name: string;
                email: string;
              }>(base, "POST", { name, email, kind });
              setName("");
              setEmail("");
              await sendTicket({
                ...created,
                active: true,
                ticket_sent_at: null,
                has_badge: false,
              });
            });
          }}
        >
          <Field className="min-w-56 flex-1">
            <FieldLabel htmlFor={`guest-name-${field}`}>Nom</FieldLabel>
            <Input
              id={`guest-name-${field}`}
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
            />
          </Field>
          <Field className="min-w-56 flex-1">
            <FieldLabel htmlFor={`guest-email-${field}`}>Correu</FieldLabel>
            <Input
              id={`guest-email-${field}`}
              required
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
            />
          </Field>
          <Button disabled={busy}>
            <Send data-icon="inline-start" />
            Crear i enviar entrada
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Aquestes persones no tenen accés a cap aplicació: només reben
          l’entrada. Al check-in es pot vincular l’acreditació i fer-la servir
          als àpats.
        </p>
        {items?.length === 0 && (
          <EmptyBox title={copy.emptyTitle}>{copy.emptyHint}</EmptyBox>
        )}
        {items?.map((guest) => (
          <div
            key={guest.id}
            className="flex flex-col gap-3 border-t pt-3 md:flex-row md:flex-wrap md:items-end md:justify-between"
          >
            <div className="flex flex-col gap-1">
              <strong>{guest.name}</strong>
              <div className="flex flex-wrap gap-2">
                {!guest.active ? (
                  <Badge variant="outline">Inactiu</Badge>
                ) : guest.ticket_sent_at ? (
                  <Badge variant="secondary">
                    Entrada enviada{" "}
                    {new Date(guest.ticket_sent_at).toLocaleString("ca")}
                  </Badge>
                ) : (
                  <Badge>Entrada pendent</Badge>
                )}
                {guest.has_badge && (
                  <Badge variant="secondary">Acreditació vinculada</Badge>
                )}
              </div>
            </div>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = String(
                  new FormData(e.currentTarget).get("email") || "",
                ).trim();
                void run(() =>
                  request(`${base}/${guest.id}`, "PATCH", { email: value }),
                );
              }}
            >
              <label className="text-sm">
                Correu de {guest.name}
                <Input
                  key={`${guest.id}:${guest.email || ""}`}
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  defaultValue={guest.email || ""}
                />
              </label>
              <Button variant="outline" disabled={busy} type="submit">
                Desar correu
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy || !guest.active || !guest.email}
                onClick={() => void run(() => sendTicket(guest))}
              >
                {guest.ticket_sent_at ? "Reenviar entrada" : "Enviar entrada"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    request(`${base}/${guest.id}`, "PATCH", {
                      active: !guest.active,
                    }),
                  )
                }
              >
                {guest.active ? "Desactivar" : "Activar"}
              </Button>
              {kind === "convidat" && guest.active && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Convertir ${guest.name} en hacker? Deixarà de ser convidat (perdrà l’entrada de Convidat) i rebrà un correu per crear la contrasenya. Després s’haurà d’inscriure a l’esdeveniment com qualsevol participant.`,
                      )
                    )
                      void run(() => promote(guest));
                  }}
                >
                  Fer hacker
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
