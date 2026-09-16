import { useState, type ReactNode, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api";
import { toast } from "sonner";
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <Alert variant="destructive">
      <AlertTitle>No s'ha pogut completar</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}
export function EmptyBox({
  title = "Encara no hi ha resultats",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          {children || "Les dades apareixeran aquí quan estiguin disponibles."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function Loading() {
  return (
    <div aria-label="Carregant" className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
export type FormField = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  min?: number;
  value?: string | number;
  multiline?: boolean;
};
export function EditDialog({
  title,
  description,
  fields,
  onSave,
  onClose,
  children,
}: {
  title: string;
  description: string;
  fields: FormField[];
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(new FormData(e.currentTarget));
      toast.success("Canvis desats");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <Field
                key={f.name}
                className={f.multiline ? "sm:col-span-2" : ""}
              >
                <FieldLabel htmlFor={`form-${f.name}`}>{f.label}</FieldLabel>
                {f.multiline ? (
                  <Textarea
                    id={`form-${f.name}`}
                    name={f.name}
                    defaultValue={f.value}
                    required={f.required}
                    disabled={busy}
                  />
                ) : (
                  <Input
                    id={`form-${f.name}`}
                    name={f.name}
                    type={f.type || "text"}
                    min={f.min}
                    step={f.type === "number" ? 1 : undefined}
                    defaultValue={f.value}
                    required={f.required}
                    disabled={busy}
                  />
                )}
              </Field>
            ))}
          </FieldGroup>
          {children}
          <ErrorBox error={error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancel·lar
            </Button>
            <Button disabled={busy}>{busy ? "Desant…" : "Desar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ErrorBox error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel·lar
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                toast.success("Operació completada");
                onClose();
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Processant…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
