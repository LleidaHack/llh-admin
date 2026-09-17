import { accountType } from "@/lib/locale";
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
  image?: string | null;
};
export function Users() {
  const [items, setItems] = useState<User[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [email, setEmail] = useState(""),
    [selected, setSelected] = useState<User | null>(null),
    [busy, setBusy] = useState(false),
    [operation, setOperation] = useState<"ban" | "unban" | "verify" | null>(
      null,
    );
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
        <p className="eyebrow">COMUNITAT</p>
        <h1>Usuaris</h1>
        <p className="text-muted-foreground">
          Consulta comptes i gestiona l'accés dels participants.
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
              Cercar un compte per correu electrònic
            </FieldLabel>
            <Input
              id="user-email"
              type="email"
              placeholder="participant@exemple.cat"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
        </FieldGroup>
        <Button disabled={busy}>
          {busy ? "Cercant…" : "Consultar el compte"}
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
            {selected.image && (
              <img
                src={selected.image}
                alt={`Foto de ${selected.name}`}
                className="h-20 w-20 rounded-full border object-cover"
              />
            )}
            <Badge variant="secondary">{accountType(selected.type)}</Badge>
            <Badge variant="outline">
              {selected.is_verified ? "Correu verificat" : "Sense verificar"}
            </Badge>
            <span className="text-sm">
              ID: {selected.id} · Codi: {selected.code}
            </span>
            {selected.is_verified === false && selected.id != null && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setOperation("verify")}
              >
                Verificar compte
              </Button>
            )}
            {selected.type === "hacker" && (
              <>
                <Button variant="outline" onClick={() => setOperation("ban")}>
                  Bloquejar l'accés
                </Button>
                <Button variant="outline" onClick={() => setOperation("unban")}>
                  Desbloquejar l'accés
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
      <Input
        aria-label="Filtrar usuaris"
        placeholder="Filtrar per nom o àlies…"
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
              <TableHead>Nom</TableHead>
              <TableHead>Àlies</TableHead>
              <TableHead>Tipus de compte</TableHead>
              <TableHead>Accions</TableHead>
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
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {u.image && (
                        <img
                          src={u.image}
                          alt=""
                          className="h-7 w-7 rounded-full border object-cover"
                        />
                      )}
                      {u.name}
                    </span>
                  </TableCell>
                  <TableCell>{u.nickname}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{accountType(u.type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void lookup(u.nickname, "nickname")}
                    >
                      Veure el compte
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
          title={`${operation === "verify" ? "Verificar" : operation === "ban" ? "Bloquejar" : "Desbloquejar"} ${selected.name}`}
          description={
            operation === "verify"
              ? `Verificaràs manualment el compte de ${selected.email || selected.nickname}, sense confirmació per correu. Aquesta acció no canvia els permisos ni desbloqueja el compte.`
              : "L'operació canvia l'accés del participant al servidor."
          }
          onClose={() => setOperation(null)}
          onConfirm={async () => {
            if (operation === "verify") {
              await request(`/v1/auth/force-verify/${selected.id}`, "POST");
              setSelected({ ...selected, is_verified: true });
            } else {
              await request(`/v1/hacker/${selected.id}/${operation}`, "POST");
            }
          }}
        />
      )}
    </div>
  );
}
