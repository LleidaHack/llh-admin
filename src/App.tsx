import { catalanValidation, clearValidation } from "@/lib/locale";
import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Building2,
  Users,
  LogOut,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBox, Loading } from "@/components/shared";
import {
  login,
  clearSession,
  hasSession,
  request,
  errorMessage,
  type Profile,
  type EventRecord,
} from "@/lib/api";
import { Events } from "@/features/events";
import { EventDetail } from "@/features/event-detail";
import { Companies } from "@/features/companies";
import { Users as UsersPage } from "@/features/users";
import { cn } from "@/lib/utils";
function Login({
  onLogin,
  message,
}: {
  onLogin: (p: Profile) => void;
  message: string;
}) {
  const [error, setError] = useState(message),
    [busy, setBusy] = useState(false);
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
            ACCÉS D'ORGANITZADORS
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
                onLogin(
                  await login(
                    String(f.get("email")),
                    String(f.get("password")),
                  ),
                );
              } catch (e) {
                setError(errorMessage(e));
              } finally {
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
            Necessites un compte d'organitzador actiu i verificat.
          </p>
        </div>
      </main>
    </div>
  );
}
export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null),
    [checking, setChecking] = useState(hasSession()),
    [section, setSection] = useState("events"),
    [selected, setSelected] = useState<number | null>(null),
    [events, setEvents] = useState<EventRecord[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [sessionMessage, setSessionMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setEvents(await request("/v1/event/all"));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (hasSession())
      request<Profile>("/v1/auth/me")
        .then((p) => {
          if (p.type !== "lleida_hacker")
            throw new Error("Cal un compte d'organitzador.");
          setProfile(p);
        })
        .catch((e) => {
          clearSession();
          setSessionMessage(errorMessage(e));
        })
        .finally(() => setChecking(false));
    const expire = () => {
      setProfile(null);
      setLoading(true);
      setSessionMessage("La sessió ha caducat. Torna a entrar.");
      setEvents([]);
      setSelected(null);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  useEffect(() => {
    if (profile) {
      void load();
    }
  }, [profile, load]);
  function navigate(page: string) {
    setSection(page);
    setSelected(null);
  }
  if (checking)
    return (
      <div className="p-12">
        <Loading />
      </div>
    );
  if (!profile)
    return (
      <>
        <Login onLogin={setProfile} message={sessionMessage} />
        <Toaster />
      </>
    );
  return (
    <div
      className="app-shell"
      onInvalidCapture={catalanValidation}
      onInputCapture={clearValidation}
    >
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-wordmark" role="img" aria-label="LleidaHack" />
        </div>
        <p className="nav-caption">ESPAI D'ORGANITZACIÓ</p>
        <nav aria-label="Navegació principal">
          {[
            { id: "events", label: "Esdeveniments", icon: CalendarDays },
            { id: "companies", label: "Empreses", icon: Building2 },
            { id: "users", label: "Usuaris", icon: Users },
          ].map((item) => (
            <Button
              key={item.id}
              variant={section === item.id ? "secondary" : "ghost"}
              className={cn("nav-button", section === item.id && "nav-active")}
              onClick={() => navigate(item.id)}
            >
              <item.icon data-icon="inline-start" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="text-sm font-medium">Fet per organitzar.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada edició, un nou començament.
          </p>
          <Button variant="ghost" asChild className="mt-4 justify-start">
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
            >
              Documentació de l'API
              <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Panell de gestió
            </span>
            <Badge variant="outline">Provisional</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:block">{profile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tancar la sessió"
              onClick={() => {
                clearSession();
                setProfile(null);
                setEvents([]);
                setSelected(null);
                setSessionMessage("");
              }}
            >
              <LogOut />
            </Button>
          </div>
        </header>
        <main className="main-content">
          <ErrorBox error={error} />
          {error && (
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw data-icon="inline-start" />
              Tornar-ho a provar
            </Button>
          )}
          {section === "events" ? (
            selected !== null ? (
              <EventDetail
                key={selected}
                id={selected}
                onBack={() => setSelected(null)}
                reloadEvents={load}
              />
            ) : loading ? (
              <Loading />
            ) : (
              <Events events={events} onSelect={setSelected} reload={load} />
            )
          ) : section === "companies" ? (
            <Companies />
          ) : (
            <UsersPage />
          )}
        </main>
        <footer className="workspace-footer">
          LleidaHack · Organització d'esdeveniments
          <span>Una comunitat. Moltes idees.</span>
        </footer>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
