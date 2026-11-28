import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { request, errorMessage } from "@/lib/api";
import { downloadCsv, toCsv } from "@/lib/csv";
import { dateTimeLabel } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Entry = {
  id: string;
  name: string;
  coins: number;
  created_at: string;
};
const coinsLabel = (n: number) => n.toLocaleString("ca");

// Hand-written list for the LleidaCoins challenge: who answered and how many
// LleidaCoins they said. Only organizers can see it.
export function CoinChallenge({ eventId }: { eventId: number }) {
  const path = `/v1/operations/${eventId}/coin-challenge`;
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [name, setName] = useState("");
  const [coins, setCoins] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setEntries(await request<Entry[]>(path));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(task: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await task();
      await load();
      toast.success(message);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    const amount = Number(coins);
    if (!name.trim() || coins === "" || !Number.isInteger(amount) || amount < 0)
      return;
    const ok = await run(
      () => request(path, "POST", { name: name.trim(), coins: amount }),
      "Resposta apuntada",
    );
    if (ok) {
      setName("");
      setCoins("");
      document.getElementById("coin-challenge-name")?.focus();
    }
  }
  const sorted = [...(entries ?? [])].sort(
    (a, b) => b.coins - a.coins || a.created_at.localeCompare(b.created_at),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repte LleidaCoins</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Apunta el nom de cada persona i les LleidaCoins que ha dit. La llista
          només la veu l’organització i no mou cap saldo.
        </p>
        <form className="flex flex-wrap items-end gap-2" onSubmit={add}>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
            Nom
            <Input
              id="coin-challenge-name"
              value={name}
              maxLength={150}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex w-36 flex-col gap-1 text-sm">
            LleidaCoins
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={1000000}
              step={1}
              value={coins}
              onChange={(e) => setCoins(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy || !name.trim() || coins === ""}>
            Afegir
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!sorted.length}
            onClick={() =>
              downloadCsv(
                `repte-lleidacoins-${eventId}.csv`,
                toCsv([
                  ["Posició", "Nom", "LleidaCoins", "Apuntat"],
                  ...sorted.map((entry, i) => [
                    i + 1,
                    entry.name,
                    entry.coins,
                    dateTimeLabel(entry.created_at),
                  ]),
                ]),
              )
            }
          >
            Descarregar CSV
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        {!entries && !error && <p role="status">Carregant llista…</p>}
        {entries &&
          (sorted.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">LleidaCoins</TableHead>
                  <TableHead>Apuntat</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((entry, i) => (
                  <TableRow key={entry.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {coinsLabel(entry.coins)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateTimeLabel(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Esborrar ${entry.name}`}
                        disabled={busy}
                        onClick={() =>
                          window.confirm(
                            `Vols esborrar ${entry.name} (${coinsLabel(entry.coins)} LleidaCoins)?`,
                          ) &&
                          void run(
                            () => request(`${path}/${entry.id}`, "DELETE"),
                            "Resposta esborrada",
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>Encara no hi ha cap resposta apuntada.</p>
          ))}
      </CardContent>
    </Card>
  );
}
