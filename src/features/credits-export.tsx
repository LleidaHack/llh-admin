import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, request } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { creditsCsv, type CreditParticipant } from "@/lib/credits";

export function CreditsExport({ eventId }: { eventId: number }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function download() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const participants = await request<CreditParticipant[]>(
        `/v1/operations/${eventId}/credits`,
      );
      downloadCsv(`credits-ECTS-${eventId}.csv`, creditsCsv(participants));
      if (!participants.length)
        toast.info("No hi ha inscripcions amb crèdits ECTS sol·licitats.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={download}
      title="Totes les inscripcions amb ECTS sol·licitats. La presentació es comprova per equip, no per assistència individual."
    >
      <Download data-icon="inline-start" />
      {busy ? "Preparant CSV…" : "Descarregar crèdits ECTS"}
    </Button>
  );
}
