"use client";
import { CsvImport } from "@/components/csv-import";
import { importMentors } from "@/lib/csv-import";
import { useEffect, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorBox } from "@/components/shared";
type Mentor = {
  id: number;
  name: string;
  email?: string | null;
  active: boolean;
  has_badge: boolean;
};
export function EventMentors({ base }: { base: string }) {
  const [items, setItems] = useState<Mentor[]>([]),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");
  const [candidates, setCandidates] = useState<{ id: number; name: string }[]>(
    [],
  );
  async function load() {
    setItems(await request<Mentor[]>(base + "/mentors"));
    setCandidates(await request(base + "/mentors/candidates"));
  }
  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, [base]);
  async function run(action: () => Promise<unknown>) {
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
    <Card>
      <CardHeader>
        <CardTitle>
          {items.filter((m) => m.active).length} mentors actius
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Només tenen accés als àpats. L’acreditació es vincula des de
          l’escàner.
        </p>
        <ErrorBox error={error} />
        <CsvImport
          label="Importar mentors des de CSV"
          disabled={busy}
          template={[
            ["name", "email", "user_id"],
            ["Mentor de mostra", "mentor@example.com", ""],
          ]}
          validate={(rows) => {
            importMentors(
              rows,
              items.map((m) => m.name),
              candidates.map((c) => c.id),
            );
          }}
          onImport={async (rows, progress) => {
            const imported = importMentors(
              rows,
              items.map((m) => m.name),
              candidates.map((c) => c.id),
            );
            setBusy(true);
            try {
              for (let i = 0; i < imported.length; i++) {
                await request(base + "/mentors", "POST", imported[i]);
                progress(i + 1);
              }
            } finally {
              try {
                await load();
              } finally {
                setBusy(false);
              }
            }
          }}
        />

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await request(base + "/mentors", "POST", {
                name,
                ...(email ? { email } : {}),
                ...(userId ? { user_id: Number(userId) } : {}),
              });
              setName("");
              setEmail("");
              setUserId("");
            });
          }}
        >
          <label>
            Nom del mentor
            <Input
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Correu per a la invitació
            <Input
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mentor@example.com"
            />
          </label>
          <label>
            Compte existent (opcional)
            <NativeSelect
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                const selected = candidates.find(
                  (c) => String(c.id) === e.target.value,
                );
                if (selected) setName(selected.name);
              }}
            >
              <NativeSelectOption value="">
                Crear una fitxa sense accés
              </NativeSelectOption>
              {candidates.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <Button disabled={busy}>Afegir mentor</Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Pots crear una fitxa només per a l’acreditació o vincular un compte
          que ja tingui el rol mentor. El correu d’invitació no modifica les
          dades d’inici de sessió. Els enviaments es gestionen a Comunicació.
        </p>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"
          >
            <span>
              <strong>{item.name}</strong> ·{" "}
              {item.has_badge ? "Acreditació vinculada" : "Sense acreditació"}
              {!item.active && " · Inactiu"}
            </span>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = String(
                  new FormData(e.currentTarget).get("email") || "",
                ).trim();
                void run(() =>
                  request(`${base}/mentors/${item.id}`, "PATCH", {
                    email: value || null,
                  }),
                );
              }}
            >
              <label className="text-sm">
                Correu d’invitació de {item.name}
                <Input
                  key={`${item.id}:${item.email || ""}`}
                  name="email"
                  type="email"
                  maxLength={254}
                  defaultValue={item.email || ""}
                  placeholder="Sense correu"
                />
              </label>
              <Button variant="outline" disabled={busy} type="submit">
                Desar correu
              </Button>
            </form>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  request(`${base}/mentors/${item.id}`, "PATCH", {
                    active: !item.active,
                  }),
                )
              }
            >
              {item.active ? "Desactivar" : "Activar"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
