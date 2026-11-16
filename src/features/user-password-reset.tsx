import { useRef, useState } from "react";
import { toast } from "sonner";
import { canEnterPanel, errorMessage, request } from "@/lib/api";
import { useViewer } from "@/lib/viewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBox } from "@/components/shared";
import type { UserProfile } from "./user-profile";

export function UserPasswordReset({ user }: { user: UserProfile }) {
  const viewer = useViewer();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  if (!canEnterPanel(viewer)) return null;
  const unavailable = !user.email
    ? "Aquest compte no té cap correu electrònic."
    : user.is_verified !== true
      ? "Cal verificar el compte abans de recuperar la contrasenya."
      : "";

  async function sendReset() {
    if (pending.current || unavailable || !user.email) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request<{ success: boolean }>(
        `/v1/auth/reset-password?${new URLSearchParams({ email: user.email })}`,
        "POST",
      );
      if (result?.success !== true)
        throw new Error(
          "El servidor no ha confirmat la sol·licitud de recuperació.",
        );
      toast.success(`Recuperació sol·licitada per a ${user.email}`);
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        disabled={Boolean(unavailable)}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Restablir contrasenya
      </Button>
      {unavailable && (
        <p className="text-sm text-muted-foreground">{unavailable}</p>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending.current) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablir la contrasenya de {user.name}</DialogTitle>
            <DialogDescription>
              Enviarem un enllaç de recuperació a {user.email}. La persona podrà
              triar una contrasenya nova. La contrasenya actual es manté fins
              que completi el canvi; qualsevol enllaç de recuperació anterior
              quedarà invalidat.
            </DialogDescription>
          </DialogHeader>
          <ErrorBox error={error} />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel·lar
            </Button>
            <Button disabled={busy} onClick={() => void sendReset()}>
              {busy ? "Sol·licitant…" : "Enviar correu de recuperació"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
