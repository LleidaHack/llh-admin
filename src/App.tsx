import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Building2,
  Users,
  LogOut,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Command,
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
    <div className="login-layout">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Command />
          </span>
          LleidaHack <span className="font-normal opacity-60">/ admin</span>
        </div>
        <div>
          <p className="eyebrow">DE LA IDEA AL ENCUENTRO</p>
          <h1>
            Todo empieza
            <br />
            con un evento.
          </h1>
          <p>
            Un espacio para organizar las ediciones, cuidar de la comunidad y
            preparar lo que viene.
          </p>
        </div>
        <span className="text-sm opacity-60">
          Panel de organización · LleidaHack
        </span>
      </section>
      <main className="login-form">
        <div className="flex w-full max-w-sm flex-col gap-7">
          <Badge variant="outline" className="self-start">
            ACCESO DE ORGANIZADORES
          </Badge>
          <div>
            <h2 className="login-title">Bienvenido de nuevo</h2>
            <p className="mt-2 text-muted-foreground">
              Entra con tu cuenta de LleidaHack.
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
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="username"
                  required
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
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
              {busy ? "Entrando…" : "Entrar al panel"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Necesitas una cuenta de organizador activa y verificada.
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
            throw new Error("Se necesita una cuenta de organizador.");
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
      setSessionMessage("Tu sesión ha caducado. Vuelve a entrar.");
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <Command />
          </span>
          LleidaHack
        </div>
        <p className="nav-caption">ESPACIO DE ORGANIZACIÓN</p>
        <nav aria-label="Navegación principal">
          {[
            { id: "events", label: "Eventos", icon: CalendarDays },
            { id: "companies", label: "Empresas", icon: Building2 },
            { id: "users", label: "Usuarios", icon: Users },
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
          <p className="text-sm font-medium">Hecho para organizar.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada edición, un nuevo comienzo.
          </p>
          <Button variant="ghost" asChild className="mt-4 justify-start">
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
            >
              Documentación API
              <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Panel de gestión
            </span>
            <Badge variant="outline">Provisional</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:block">{profile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
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
              Reintentar
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
          LleidaHack · Organización de eventos
          <span>Una comunidad. Muchas ideas.</span>
        </footer>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
