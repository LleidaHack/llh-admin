import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Ticket } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog, ErrorBox } from "@/components/shared";
import {
  request,
  fetchFileUrl,
  errorMessage,
  type TicketsStatus,
  type Voucher,
  type VoucherSummary,
} from "@/lib/api";

// "Generate event tickets": mails the check-in QR to every accepted and
// confirmed hacker. The backend runs it in background; we poll the status
// (DB-backed counts) while it reports running.
export function TicketsCard({ id }: { id: number }) {
  const [status, setStatus] = useState<TicketsStatus | null>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await request<TicketsStatus>(`/v1/event/${id}/tickets/status`));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!status?.running) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [status?.running, load]);

  const send = (force: boolean) =>
    setConfirmation({
      title: force
        ? "Reenviar els tiquets a tothom"
        : "Generar els tiquets de l'esdeveniment",
      description: force
        ? `Es tornarà a enviar el correu amb el QR de check-in als ${status?.eligible ?? 0} participants acceptats i confirmats, encara que ja l'hagin rebut. Aquesta acció envia correus reals.`
        : `S'enviarà el correu amb el QR de check-in als ${status?.pending ?? 0} participants acceptats i confirmats que encara no l'han rebut. Aquesta acció envia correus reals.`,
      run: async () => {
        await request(`/v1/event/${id}/tickets/send${force ? "?force=true" : ""}`, "POST");
        await load();
      },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tiquets de check-in</CardTitle>
        <CardDescription>
          Un cop tancades les inscripcions, genera els tiquets: cada participant
          acceptat i confirmat rep un correu amb el seu QR, que també veu al seu
          perfil. El dia de l&apos;esdeveniment s&apos;escaneja al check-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorBox error={error} />
        {status && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Amb dret a tiquet: {status.eligible}</Badge>
            <Badge variant="secondary">Enviats: {status.sent}</Badge>
            <Badge variant={status.pending ? "default" : "secondary"}>
              Pendents: {status.pending}
            </Badge>
            {status.running && (
              <Badge>
                <RefreshCw data-icon="inline-start" className="animate-spin" />
                Enviant… {status.progress.sent ?? 0}/{status.progress.total ?? 0}
              </Badge>
            )}
            {(status.progress.failed ?? 0) > 0 && (
              <Badge variant="destructive">
                Errors d&apos;enviament: {status.progress.failed}
              </Badge>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => send(false)}
            disabled={!status || status.running || status.pending === 0}
          >
            <Ticket data-icon="inline-start" />
            Generar tiquets de l&apos;esdeveniment
          </Button>
          <Button
            variant="outline"
            onClick={() => send(true)}
            disabled={!status || status.running || status.eligible === 0}
          >
            Reenviar a tothom
          </Button>
          <Button variant="ghost" onClick={() => void load()} disabled={!status}>
            <RefreshCw data-icon="inline-start" />
            Actualitzar
          </Button>
        </div>
        {status && status.eligible === 0 && (
          <p className="text-sm text-muted-foreground">
            Encara no hi ha cap participant acceptat i confirmat.
          </p>
        )}
      </CardContent>
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          onConfirm={confirmation.run}
          onClose={() => setConfirmation(null)}
        />
      )}
    </Card>
  );
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Physical vouchers (printed badges): generated in bulk before the event,
// bound to a hacker at check-in by the scanning app, released here if lost.
export function VouchersCard({ id }: { id: number }) {
  const [summary, setSummary] = useState<VoucherSummary | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [count, setCount] = useState("100");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([
        request<VoucherSummary>(`/v1/event/${id}/vouchers/summary`),
        request<Voucher[]>(`/v1/event/${id}/vouchers/`),
      ]);
      setSummary(s);
      setVouchers(list);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = () => {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 2000) {
      setError("Indica un nombre de vouchers entre 1 i 2000.");
      return;
    }
    setConfirmation({
      title: `Generar ${n} vouchers`,
      description: `Es crearan ${n} codis nous per imprimir a les acreditacions físiques d'aquest esdeveniment.`,
      run: async () => {
        await request(`/v1/event/${id}/vouchers/generate`, "POST", { count: n });
        await load();
      },
    });
  };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const url = await fetchFileUrl(`/v1/event/${id}/vouchers/export.csv`);
      download(url, `vouchers_event_${id}.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const release = (v: Voucher) =>
    setConfirmation({
      title: `Alliberar ${v.code}`,
      description: `El voucher deixarà d'estar assignat a ${v.hacker?.name ?? "aquest participant"}. La seva assistència es manté i se li podrà assignar un altre voucher al check-in.`,
      run: async () => {
        await request(`/v1/event/${id}/vouchers/${encodeURIComponent(v.code)}/assign`, "DELETE");
        await load();
      },
    });

  const needle = filter.trim().toLowerCase();
  const visible = (vouchers ?? []).filter(
    (v) =>
      !needle ||
      v.code.toLowerCase().includes(needle) ||
      (v.hacker?.name ?? "").toLowerCase().includes(needle) ||
      (v.hacker?.email ?? "").toLowerCase().includes(needle),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vouchers (acreditacions físiques)</CardTitle>
        <CardDescription>
          Genera els codis QR que s&apos;imprimiran a les acreditacions. Al
          check-in, l&apos;app de lectura escaneja el tiquet del participant i
          després un voucher en blanc per vincular-los. Durant
          l&apos;esdeveniment els àpats es llegeixen amb el voucher.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorBox error={error} />
        {summary && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Total: {summary.total}</Badge>
            <Badge variant="secondary">Assignats: {summary.assigned}</Badge>
            <Badge variant="secondary">Lliures: {summary.unassigned}</Badge>
          </div>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
        >
          <Field className="w-32">
            <FieldLabel htmlFor="voucher-count">Quantitat</FieldLabel>
            <Input
              id="voucher-count"
              type="number"
              min={1}
              max={2000}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
          <Button type="submit">Generar vouchers</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportCsv()}
            disabled={busy || !summary || summary.total === 0}
          >
            <Download data-icon="inline-start" />
            Exportar CSV
          </Button>
          <Button type="button" variant="ghost" onClick={() => void load()}>
            <RefreshCw data-icon="inline-start" />
            Actualitzar
          </Button>
        </form>
        {vouchers && vouchers.length > 0 && (
          <>
            <Input
              aria-label="Cerca vouchers"
              placeholder="Cerca per codi, nom o correu…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="sm:max-w-sm"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codi</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Assignat</TableHead>
                  <TableHead>Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.slice(0, 200).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono">{v.code}</TableCell>
                    <TableCell>
                      {v.hacker ? (
                        <>
                          {v.hacker.name}
                          {v.hacker.email && (
                            <span className="block text-xs text-muted-foreground">
                              {v.hacker.email}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Lliure</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {v.assigned_at ? new Date(v.assigned_at).toLocaleString("ca") : "—"}
                    </TableCell>
                    <TableCell>
                      {v.hacker && (
                        <Button variant="outline" size="sm" onClick={() => release(v)}>
                          Alliberar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {visible.length > 200 && (
              <p className="text-sm text-muted-foreground">
                Es mostren 200 de {visible.length}. Afina la cerca o exporta el CSV.
              </p>
            )}
          </>
        )}
        {vouchers && vouchers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Encara no hi ha vouchers per a aquest esdeveniment.
          </p>
        )}
      </CardContent>
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          onConfirm={confirmation.run}
          onClose={() => setConfirmation(null)}
        />
      )}
    </Card>
  );
}
