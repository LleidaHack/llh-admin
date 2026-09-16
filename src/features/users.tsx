import { useState, useEffect } from "react";
import { request, errorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  EmptyBox,
  ErrorBox,
  Loading,
  ConfirmDialog,
} from "@/components/shared";
type User = {
  id?: number;
  name: string;
  nickname: string;
  type: string;
  email?: string;
  is_verified?: boolean;
  code?: string;
  telephone?: string;
};
export function Users() {
  const [items, setItems] = useState<User[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [email, setEmail] = useState(""),
    [selected, setSelected] = useState<User | null>(null),
    [busy, setBusy] = useState(false),
    [operation, setOperation] = useState<"ban" | "unban" | null>(null);
  useEffect(() => {
    request<User[]>("/v1/user/all")
      .then(setItems)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  async function lookup(value: string, kind = "email") {
    setBusy(true);
    setError("");
    setSelected(null);
    try {
      setSelected(
        await request(`/v1/user/${kind}/${encodeURIComponent(value)}`),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">COMUNIDAD</p>
        <h1>Usuarios</h1>
        <p className="text-muted-foreground">
          Consulta cuentas y gestiona el acceso de los participantes.
        </p>
      </div>
      <ErrorBox error={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(email);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <FieldGroup className="max-w-md">
          <Field>
            <FieldLabel htmlFor="user-email">
              Buscar una cuenta por email
            </FieldLabel>
            <Input
              id="user-email"
              type="email"
              placeholder="participante@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
        </FieldGroup>
        <Button disabled={busy}>
          {busy ? "Buscando…" : "Consultar cuenta"}
        </Button>
      </form>
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.name}</CardTitle>
            <CardDescription>
              {selected.email} · {selected.nickname}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{selected.type}</Badge>
            <Badge variant="outline">
              {selected.is_verified ? "Email verificado" : "Sin verificar"}
            </Badge>
            <span className="text-sm">
              ID: {selected.id} · Código: {selected.code}
            </span>
            {selected.type === "hacker" && (
              <>
                <Button variant="outline" onClick={() => setOperation("ban")}>
                  Bloquear acceso
                </Button>
                <Button variant="outline" onClick={() => setOperation("unban")}>
                  Desbloquear acceso
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
      <Input
        aria-label="Filtrar usuarios"
        placeholder="Filtrar por nombre o apodo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="sm:max-w-xs"
      />
      {loading ? (
        <Loading />
      ) : items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Apodo</TableHead>
              <TableHead>Tipo de cuenta</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items
              .filter((u) =>
                `${u.name} ${u.nickname}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((u) => (
                <TableRow key={u.nickname}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.nickname}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {{
                        hacker: "Participante",
                        lleida_hacker: "Organizador",
                        company: "Empresa",
                      }[u.type] || u.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void lookup(u.nickname, "nickname")}
                    >
                      Ver cuenta
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyBox />
      )}
      {operation && selected && (
        <ConfirmDialog
          title={`${operation === "ban" ? "Bloquear" : "Desbloquear"} a ${selected.name}`}
          description="La operación cambia el acceso del participante al backend."
          onClose={() => setOperation(null)}
          onConfirm={async () => {
            await request(`/v1/hacker/${selected.id}/${operation}`, "POST");
          }}
        />
      )}
    </div>
  );
}
