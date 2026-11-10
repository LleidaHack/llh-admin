"use client";
import { useEffect, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorBox } from "@/components/shared";
type Mentor = { id: number; name: string; active: boolean; has_badge: boolean };
export function EventMentors({ base }: { base: string }) {
  const [items, setItems] = useState<Mentor[]>([]), [name, setName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");
  const [candidates, setCandidates] = useState<{id: number; name: string}[]>([]);
  async function load() { setItems(await request<Mentor[]>(base + "/mentors")); setCandidates(await request(base + "/mentors/candidates")); }
  useEffect(() => { void load().catch(e => setError(errorMessage(e))); }, [base]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await load(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>{items.filter(m => m.active).length} mentors actius</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Només tenen accés als àpats. L’acreditació es vincula des de l’escàner.</p>
    <ErrorBox error={error} />
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void run(async () => { await request(base + "/mentors", "POST", { name, ...(userId ? { user_id: Number(userId) } : {}) }); setName(""); setUserId(""); }); }}>
      <label>Nom del mentor<Input required minLength={2} maxLength={150} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Compte existent (opcional)<NativeSelect value={userId} onChange={e => { setUserId(e.target.value); const selected = candidates.find(c => String(c.id) === e.target.value); if (selected) setName(selected.name); }}><NativeSelectOption value="">Crear una fitxa sense accés</NativeSelectOption>{candidates.map(c => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}</NativeSelect></label>
      <Button disabled={busy}>Afegir mentor</Button>
    </form>
    <p className="text-sm text-muted-foreground">Pots crear una fitxa només per a l’acreditació o vincular un compte que ja tingui el rol mentor.</p>
    {items.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><span><strong>{item.name}</strong> · {item.has_badge ? "Acreditació vinculada" : "Sense acreditació"}{!item.active && " · Inactiu"}</span><Button variant="outline" disabled={busy} onClick={() => void run(() => request(`${base}/mentors/${item.id}`, "PATCH", { active: !item.active }))}>{item.active ? "Desactivar" : "Activar"}</Button></div>)}
  </CardContent></Card>;
}
