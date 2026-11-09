"use client";
import { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBox } from "@/components/shared";
import { downloadCsv, toCsv } from "@/lib/csv";
import { parseImportCsv, type CsvRow } from "@/lib/csv-import";
import { errorMessage } from "@/lib/api";

export function CsvImport({
  label,
  template,
  validate,
  onImport,
  disabled = false,
}: {
  label: string;
  template: string[][];
  validate: (rows: CsvRow[]) => void;
  onImport: (rows: CsvRow[], progress: (done: number) => void) => Promise<void>;
  disabled?: boolean;
}) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [attempted, setAttempted] = useState(false);
  return (
    <section className="space-y-3 rounded-md border p-4" aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadCsv("plantilla.csv", toCsv(template))}
        >
          Descarregar plantilla
        </Button>
      </div>
      <Input
        type="file"
        accept=".csv,text/csv"
        aria-label={label}
        disabled={busy || disabled}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setRows([]);
          setError("");
          setDone(0);
          setAttempted(false);
          try {
            if (file.size > 1_000_000)
              throw new Error("El fitxer supera 1 MB.");
            const parsed = parseImportCsv(await file.text());
            validate(parsed);
            setRows(parsed);
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      />
      <ErrorBox error={error} />
      {!!rows.length && (
        <>
          <p className="text-sm" role="status">
            {rows.length} registres validats · {done} importats
          </p>
          <div className="max-h-64 overflow-auto">
            <Table className="w-full text-left text-sm">
              <TableHeader>
                <TableRow>
                  {Object.keys(rows[0]).map((key) => (
                    <TableHead className="p-2" key={key}>
                      {key}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    {Object.entries(row).map(([key, value]) => (
                      <TableCell
                        className="max-w-72 whitespace-pre-wrap break-words border-t p-2"
                        key={key}
                      >
                        {value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            disabled={busy || disabled || attempted}
            onClick={async () => {
              setBusy(true);
              setAttempted(true);
              setError("");
              try {
                validate(rows);
                await onImport(rows, setDone);
              } catch (err) {
                setError(
                  `${errorMessage(err)} No tornis a importar sense comprovar els registres creats.`,
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? "Important…"
              : attempted
                ? "Importació finalitzada o aturada"
                : "Confirmar importació"}
          </Button>
        </>
      )}
    </section>
  );
}
