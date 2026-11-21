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
import { mlhCsv, type MlhProfile } from "@/lib/mlh-export";

export function ParticipantExportTab({ eventId }: { eventId: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const [mlhBusy, setMlhBusy] = useState(false);
  const [mlhError, setMlhError] = useState("");
  const mlhPending = useRef(false);

  async function downloadMlh() {
    if (mlhPending.current) return;
    mlhPending.current = true;
    setMlhBusy(true);
    setMlhError("");
    try {
      const data = await request<ParticipantExport>(
        `/v1/operations/${eventId}/participants-export`,
      );
      const profiles: MlhProfile[] = [];
      for (let offset = 0; offset < data.participants.length; offset += 5) {
        profiles.push(
          ...(await Promise.all(
            data.participants
              .slice(offset, offset + 5)
              .map((participant) =>
                request<MlhProfile>(`/v1/hacker/${participant.id}`),
              ),
          )),
        );
      }
      downloadCsv(
        `mlh-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`,
        mlhCsv(data.participants, profiles),
      );
      if (!data.participants.length)
        toast.info("No hi ha participants. El CSV només conté les capçaleres.");
      else
        toast.success(
          `CSV MLH preparat amb ${data.participants.length} participants.`,
        );
    } catch (error) {
      setMlhError(
        `No s’ha pogut exportar MLH. Torna-ho a provar. ${errorMessage(error)}`,
      );
    } finally {
      mlhPending.current = false;
      setMlhBusy(false);
    }
  }

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
          <CardTitle>Export MLH</CardTitle>
          <CardDescription>
            CSV amb les 12 columnes MLH: nom, cognoms, correu, telèfon, edat,
            país de residència, centre, estudis i respostes als consentiments
            MLH. Inclou totes les inscripcions, sense filtrar per estat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Revisa el fitxer abans d’enviar-lo: el nom es divideix pel primer
            espai i l’edat correspon a l’inici de l’esdeveniment. Els estudis
            s’exporten tal com es van registrar. El país de residència i els
            consentiments «Event Logistics Information» i «Communication from
            MLH» queden buits perquè no es recullen per separat. No s’infereixen
            de la ubicació ni de les preferències de notificacions.
          </p>
          <ErrorBox error={mlhError} />
          <Button
            className="self-start"
            variant="outline"
            disabled={mlhBusy}
            onClick={downloadMlh}
          >
            <Download data-icon="inline-start" />
            {mlhBusy ? "Preparant CSV MLH…" : "Export MLH"}
          </Button>
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {mlhBusy
              ? "Consultant inscripcions, telèfons i consentiments MLH…"
              : "Els consentiments desconeguts queden buits; les respostes registrades s’exporten com Yes o No."}
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
