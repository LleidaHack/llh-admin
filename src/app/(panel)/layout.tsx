"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Building2,
  Users,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { catalanValidation, clearValidation } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared";
import {
  clearSession,
  hasSession,
  request,
  type Profile,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/events", label: "Esdeveniments", icon: CalendarDays },
  { href: "/companies", label: "Empreses", icon: Building2 },
  { href: "/users", label: "Usuaris", icon: Users },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    if (!hasSession()) {
      router.replace("/login");
      return;
    }
    request<Profile>("/v1/auth/me")
      .then((p) => {
        if (!active) return;
        if (p.type !== "lleida_hacker")
          throw new Error("Cal un compte d'organitzador.");
        setProfile(p);
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        router.replace("/login?reason=expired");
      });
    const expire = () => {
      clearSession();
      router.replace("/login?reason=expired");
    };
    window.addEventListener("session-expired", expire);
    return () => {
      active = false;
      window.removeEventListener("session-expired", expire);
    };
  }, [router]);

  if (checking || !profile)
    return (
      <div className="p-12">
        <Loading />
      </div>
    );

  const apiOrigin =
    process.env.NEXT_PUBLIC_API_ORIGIN || "http://127.0.0.1:8000";
  const envLabel = process.env.NEXT_PUBLIC_ENVIRONMENT_LABEL || "Local";

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
        <p className="nav-caption">ESPAI D&apos;ORGANITZACIÓ</p>
        <nav aria-label="Navegació principal">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "secondary" : "ghost"}
                className={cn("nav-button", active && "nav-active")}
              >
                <Link href={item.href}>
                  <item.icon data-icon="inline-start" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <p className="text-sm font-medium">Fet per organitzar.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada edició, un nou començament.
          </p>
          <Button variant="ghost" asChild className="mt-4 justify-start">
            <a href={`${apiOrigin}/docs`} target="_blank" rel="noreferrer">
              Documentació de l&apos;API
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
            <Badge variant="outline">{envLabel}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:block">{profile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tancar la sessió"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              <LogOut />
            </Button>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
