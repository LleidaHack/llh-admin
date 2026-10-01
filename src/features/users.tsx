import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserProfileDetails, type UserProfile as User } from "./user-profile";
import { searchIndex, searchItems } from "@/lib/search";
import { SearchPagination, PAGE_SIZE } from "@/components/search-pagination";
import { accountType } from "@/lib/locale";
import { useState, useEffect, useMemo, useRef } from "react";
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
export function Users() {
  const [items, setItems] = useState<User[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [email, setEmail] = useState(""),
    [selected, setSelected] = useState<User | null>(null),
    [busy, setBusy] = useState(false),
    [operation, setOperation] = useState<"ban" | "unban" | "verify" | null>(
      null,
    );
  const lookupId = useRef(0);
  useEffect(() => {
    request<User[]>("/v1/user/all")
      .then(setItems)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  async function lookup(value: string, kind = "email") {
    const id = ++lookupId.current;
    setBusy(true);
    setError("");
    setSelected(null);
    try {
      const user = await request<User>(
        `/v1/user/${kind}/${encodeURIComponent(value.trim())}`,
      );
      if (id === lookupId.current) setSelected(user);
    } catch (e) {
      if (id === lookupId.current) setError(errorMessage(e));
    } finally {
      if (id === lookupId.current) setBusy(false);
    }
  }
  const index = useMemo(
    () => searchIndex(items, (u) => `${u.name} ${u.nickname} ${u.email || ""}`),
    [items],
  );
  const filtered = useMemo(() => searchItems(index, query), [index, query]);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
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
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setOperation(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Fitxa de l'usuari</DialogTitle>
              <DialogDescription>
                Dades del compte, perfil i participacions.
              </DialogDescription>
            </DialogHeader>
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
                  {selected.is_verified
                    ? "Correu verificat"
                    : "Sense verificar"}
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
                    <Button
                      variant="outline"
                      onClick={() => setOperation("ban")}
                    >
                      Bloquejar l'accés
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOperation("unban")}
                    >
                      Desbloquejar l'accés
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            <UserProfileDetails
              key={selected.id ?? selected.nickname}
              user={selected}
            />
          </DialogContent>
        </Dialog>
      )}
      <Input
        aria-label="Filtrar usuaris"
        placeholder="Filtrar per nom o àlies…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        className="sm:max-w-xs"
      />
      {loading ? (
        <Loading />
      ) : filtered.length ? (
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
            {filtered
              .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
              .map((u) => (
                <TableRow
                  key={u.nickname}
                  className="cursor-pointer"
                  onClick={() => {
                    if (!busy) void lookup(u.nickname, "nickname");
                  }}
                >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        void lookup(u.nickname, "nickname");
                      }}
                    >
                      Veure el compte
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyBox
          title={query ? "Cap usuari coincideix" : "No hi ha usuaris"}
        />
      )}
      {!loading && (
        <SearchPagination
          page={currentPage}
          total={filtered.length}
          onChange={setPage}
        />
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
              setSelected({ ...selected, banned: operation === "ban" });
            }
          }}
        />
      )}
    </div>
  );
}
