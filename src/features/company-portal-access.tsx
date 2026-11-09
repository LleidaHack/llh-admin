"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { request, errorMessage, type Company } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBox } from "@/components/shared";
type Access = {
  company_id: number;
  company: string;
  email: string;
  rooms: string[];
  active: boolean;
  setup_complete: boolean;
  delivery_state: string | null;
  winner_id: number | null;
};
const deliveryLabels: Record<string, string> = {
  pending: "En cua",
  creating: "Preparant correu",
  ready: "Preparat per enviar",
  sending: "Enviant",
  sent: "Enviat",
  uncertain: "Enviament no confirmat; revisa abans de tornar a convidar",
  expired: "Enllaç caducat o substituït",
};
export function CompanyPortalAccess({
  id,
  companies,
}: {
  id: number;
  companies: Company[];
}) {
  const [rows, setRows] = useState<Access[]>([]),
    [rooms, setRooms] = useState<{ id: string; title: string }[]>([]);
  const [company, setCompany] = useState(""),
    [email, setEmail] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<{ key: string; id: string } | null>(null);
  const load = useCallback(async () => {
    const [access, config] = await Promise.all([
      request<Access[]>(`/v1/company-portal/manage/${id}`),
      request<{ rooms: { id: string; title: string }[] }>(
        `/v1/operations/${id}/manage`,
      ),
    ]);
    setRows(access);
    setRooms(config.rooms);
  }, [id]);
  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, [load]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (
      !confirm(
        "Enviar una invitació real per correu? Els enllaços anteriors d’aquesta empresa quedaran invalidats. Si canvien la contrasenya, es tancaran les sessions anteriors.",
      )
    )
      return;
    setBusy(true);
    setError("");
    const payload = { company_id: Number(company), email, rooms: selected };
    const key = JSON.stringify(payload);
    pending.current =
      pending.current?.key === key
        ? pending.current
        : { key, id: crypto.randomUUID() };
    try {
      await request(`/v1/company-portal/manage/${id}/invite`, "POST", {
        ...payload,
        operation_id: pending.current.id,
      });
      pending.current = null;
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
        <CardTitle>Portal d’empreses · Invitacions i permisos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Un compte compartit per empresa. Només veurà els projectes de les
          sales seleccionades. Els correus es processen en segon pla.
        </p>
        <ErrorBox error={error} />
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void load().catch((e) => setError(errorMessage(e)))}
        >
          Actualitzar estat
        </Button>
        <form className="space-y-4" onSubmit={send}>
          <label>
            Empresa
            <NativeSelect
              required
              value={company}
              disabled={busy}
              onChange={(e) => {
                setCompany(e.target.value);
                const existing = rows.find(
                  (r) => String(r.company_id) === e.target.value,
                );
                setEmail(existing?.email || "");
                setSelected(existing?.rooms || []);
              }}
            >
              <NativeSelectOption value="">Selecciona…</NativeSelectOption>
              {companies.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label>
            Correu del compte compartit
            <Input
              type="email"
              required
              value={email}
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <fieldset disabled={busy}>
            <legend>Sales autoritzades</legend>
            {rooms.map((r) => (
              <label className="flex min-h-11 items-center gap-2" key={r.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, r.id]
                        : selected.filter((x) => x !== r.id),
                    )
                  }
                />
                {r.title}
              </label>
            ))}
          </fieldset>
          <Button disabled={busy || !company || !selected.length}>
            Enviar invitació / restablir accés
          </Button>
        </form>
        {rows.map((row) => (
          <div className="space-y-2 rounded border p-4" key={row.company_id}>
            <strong>{row.company}</strong>
            <p>
              {row.email} · {row.active ? "Accés actiu" : "Accés revocat"}
            </p>
            <p>
              {row.setup_complete
                ? "Compte configurat"
                : "Pendent de crear contrasenya"}{" "}
              · Correu: {deliveryLabels[row.delivery_state || ""] || "—"}
            </p>
            <p>Sales: {row.rooms.join(", ")}</p>
            {row.winner_id && (
              <p>Equip proposat com a guanyador: {row.winner_id}</p>
            )}
            <Button
              variant="destructive"
              disabled={busy || !row.active}
              onClick={async () => {
                if (
                  !confirm(
                    `Revocar l’accés de ${row.company} a aquest esdeveniment?`,
                  )
                )
                  return;
                setBusy(true);
                try {
                  await request(
                    `/v1/company-portal/manage/${id}/${row.company_id}`,
                    "DELETE",
                  );
                  await load();
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Revocar accés
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
