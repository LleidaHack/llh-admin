"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { catalanValidation, clearValidation } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ErrorBox } from "@/components/shared";
import { login, errorMessage } from "@/lib/api";

const expiredMessage = "La sessió ha caducat. Torna a entrar.";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(
    params.get("reason") === "expired" ? expiredMessage : "",
  );
  const [busy, setBusy] = useState(false);
  const next = params.get("next");
  return (
    <div
      className="login-layout"
      onInvalidCapture={catalanValidation}
      onInputCapture={clearValidation}
    >
      <section className="login-story">
        <div className="brand">
          <span className="brand-wordmark" role="img" aria-label="LleidaHack" />
        </div>
      </section>
      <main className="login-form">
        <div className="flex w-full max-w-sm flex-col gap-7">
          <Badge variant="outline" className="self-start">
            ACCÉS D&apos;ORGANITZADORS ·{" "}
            {process.env.NEXT_PUBLIC_ENVIRONMENT_LABEL || "Local"}
          </Badge>
          <div>
            <h2 className="login-title">Et donem la benvinguda</h2>
            <p className="mt-2 text-muted-foreground">
              Entra amb el teu compte de LleidaHack.
            </p>
          </div>
          <form
            className="flex flex-col gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                await login(String(f.get("email")), String(f.get("password")));
                router.replace(next && next.startsWith("/") ? next : "/events");
              } catch (err) {
                setError(errorMessage(err));
                setBusy(false);
              }
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Correu electrònic</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@exemple.cat"
                  autoComplete="username"
                  required
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contrasenya</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />
              </Field>
            </FieldGroup>
            <ErrorBox error={error} />
            <Button size="lg" disabled={busy}>
              {busy ? "Entrant…" : "Entrar al panell"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Necessites un compte d&apos;organitzador actiu i verificat.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
