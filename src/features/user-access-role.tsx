"use client";
import { useEffect, useState } from "react";
import { request, errorMessage, type Profile } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Change = {
  id: number;
  actor_id: number | null;
  previous_role: string;
  new_role: string;
  reason: string;
  created_at: string;
};
const descriptions: Record<string, string> = {
  superadmin: "Accés complet a Gestió, rols i accions crítiques.",
  admin: "Gestió operativa sense canviar rols, saldos ni regles de premis.",
  lleidahacker: "Escàner QR a HackEPS. Sense accés a Gestió.",
  hacker: "Perfil, equip, QR, punts i torns propis.",
  mentor: "Acreditació per als àpats. Sense escàner, punts ni accés a Gestió.",
};
export function UserAccessRole({
  userId,
  initialRole = "hacker",
}: {
  userId: number;
  initialRole?: string;
}) {
  const [viewer, setViewer] = useState<Profile | null>(null),
    [role, setRole] = useState(initialRole),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<Change[]>([]);
  useEffect(() => {
    let active = true;
    request<Profile>("/v1/auth/me")
      .then((p) => {
        if (!active) return;
        setViewer(p);
        if (p.access_role === "superadmin")
          void request<Change[]>(`/v1/access/users/${userId}/history`)
            .then((h) => {
              if (active) setHistory(h);
            })
            .catch((e) => {
              if (active) setError(errorMessage(e));
            });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);
  if (viewer?.access_role !== "superadmin") return null;
  return (
    <section className="user-access-role my-4 space-y-3 rounded border p-4">
      <h3 className="font-semibold">Rol i permisos</h3>
      <p className="text-sm text-muted-foreground">
        Canviar el rol conserva les inscripcions, els equips i l’historial del
        compte.
      </p>
      <label className="block">
        Rol
        <select
          className="mt-1 block w-full rounded border bg-background p-2"
          aria-label="Rol d’accés de l’usuari"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {Object.keys(descriptions).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <p>{descriptions[role]}</p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <Button
        disabled={
          busy ||
          (viewer.id === userId && role !== "superadmin")
        }
        onClick={async () => {
          if (!window.confirm(`Assignar el rol ${role} a aquest usuari?`))
            return;
          setBusy(true);
          setError("");
          setNotice("");
          try {
            await request(`/v1/access/users/${userId}/role`, "PATCH", {
              role,
              reason: `Assign ${role} role from user management`,
            });
            setNotice(
              "Rol actualitzat. Els permisos ja s’apliquen a la sessió actual.",
            );
            setHistory(
              await request<Change[]>(`/v1/access/users/${userId}/history`),
            );
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Desar rol
      </Button>
      <details>
        <summary>Historial de permisos ({history.length})</summary>
        {history.map((h) => (
          <p key={h.id} className="border-t py-2 text-sm">
            {new Date(h.created_at).toLocaleString()} · {h.previous_role} →{" "}
            {h.new_role} · Organitzador #{h.actor_id ?? "servei"} · {h.reason}
          </p>
        ))}
      </details>
    </section>
  );
}
