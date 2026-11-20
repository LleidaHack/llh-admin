import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ErrorBox } from "@/components/shared";
import { errorMessage, request } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import {
  participantsCsv,
  type ParticipantExport,
} from "@/lib/participant-export";
import { CreditsExport } from "./credits-export";

export function ParticipantExportTab({ eventId }: { eventId: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function download() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await request<ParticipantExport>(
        `/v1/operations/${eventId}/participants-export`,
      );
      downloadCsv(
        `participants-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`,
        participantsCsv(data),
      );
      if (!data.participants.length)
        toast.info("No hi ha participants. El CSV només conté les capçaleres.");
      else
        toast.success(
          `CSV preparat amb ${data.participants.length} participants.`,
        );
    } catch (error) {
      setError(
        `No s’ha pogut exportar. Torna-ho a provar. ${errorMessage(error)}`,
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Exportar participants</CardTitle>
          <CardDescription>
            Descarrega totes les inscripcions de l’esdeveniment en un CSV
            compatible amb Excel i Google Sheets. Inclou tots els estats, sense
            aplicar els filtres de la llista.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Nom, correu, àlies, equip i estat de la inscripció.</li>
            <li>
              Confirmació d’assistència, check-in i dates d’inscripció,
              cancel·lació i enviament de l’entrada.
            </li>
            <li>
              Si ha menjat, nombre d’àpats diferents consumits i una columna
              Sí/No per cada àpat.
            </li>
            <li>
              Estudis, restriccions alimentàries, talla, ECTS, edat, CV
              disponible, LleidaCoins i nombre de notes.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Les dades es consulten en descarregar. Els àpats indiquen consum
            registrat; no es compten els escanejos anul·lats. Els valors
            desconeguts es mantenen diferenciats de «No».
          </p>
          <ErrorBox error={error} />
          <Button className="self-start" disabled={busy} onClick={download}>
            <Download data-icon="inline-start" />
            {busy ? "Preparant CSV…" : "Descarregar tots els participants"}
          </Button>
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {busy
              ? "Consultant inscripcions, assistència i àpats…"
              : "Una fila per participant. Una columna per àpat, encara que comparteixin nom."}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Crèdits ECTS</CardTitle>
          <CardDescription>
            Exportació específica de les persones que han sol·licitat crèdits i
            l’estat de presentació del seu equip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreditsExport eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
