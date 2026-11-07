"use client";
import { useEffect, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBox } from "@/components/shared";

type Entry = { id: number; user_id: number; previous: string; proposed: string; status: string; actor_id: number | null; created_at: string; resolved_at: string | null };
const statuses: Record<string, string> = { pending: "Pendent", approved: "Aprovat", rejected: "Rebutjat", corrected: "Corregit", superseded: "Substituït" };
export function NicknameModeration() {
  const [items, setItems] = useState<Entry[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function load() { setItems(await request<Entry[]>("/v1/nicknames/requests")); }
  useEffect(() => { void load().catch(e => setError(errorMessage(e))); }, []);
  async function decide(id: number, action: string) {
    setBusy(true); setError("");
    try { await request(`/v1/nicknames/requests/${id}`, "POST", { action }); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Canvis de nom d’usuari</CardTitle></CardHeader><CardContent className="space-y-3">
    <ErrorBox error={error} /><Button variant="outline" disabled={busy} onClick={() => void load().catch(e => setError(errorMessage(e)))}>Actualitza</Button>
    {!items.length && <p>No hi ha sol·licituds.</p>}
    {items.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 border-b py-3">
      <span><strong>{item.previous}</strong> → <strong>{item.proposed}</strong> · {statuses[item.status]}<small className="block text-muted-foreground">Usuari #{item.user_id} · {new Date(item.created_at).toLocaleString("ca")}{item.actor_id && ` · Resolt per #${item.actor_id}`}{item.resolved_at && ` · ${new Date(item.resolved_at).toLocaleString("ca")}`}</small></span>
      {item.status === "pending" && <><Button disabled={busy} onClick={() => void decide(item.id, "approve")}>Aprova</Button><Button variant="outline" disabled={busy} onClick={() => void decide(item.id, "reject")}>Rebutja</Button></>}
    </div>)}
  </CardContent></Card>;
}
export function NicknameCorrection({ userId, onSaved }: { userId: number; onSaved: (nickname: string) => void }) {
  const [nickname, setNickname] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <form className="space-y-2" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    try { await request(`/v1/nicknames/users/${userId}`, "POST", { nickname }); onSaved(nickname); setNickname(""); }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }}><label>Corregir el nom d’usuari<Input required minLength={2} maxLength={40} value={nickname} onChange={e => setNickname(e.target.value)} /></label><Button disabled={busy}>Desa el nom</Button><ErrorBox error={error} /></form>;
}
