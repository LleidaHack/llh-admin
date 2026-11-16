import { UserPasswordReset } from "./user-password-reset";
import { NicknameModeration } from "./nickname-moderation";
import { useCanRunCritical } from "@/lib/viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserProfileDetails, type UserProfile as User } from "./user-profile";
import { searchIndex, searchItems } from "@/lib/search";
import { lookupUser, type UserLookupKind } from "@/lib/user-lookup";
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
  // Ban/unban and force-verify are superadmin-only on the backend.
  const critical = useCanRunCritical();
  const [items, setItems] = useState<User[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [lookupValue, setLookupValue] = useState(""),
    [lookupKind, setLookupKind] = useState<UserLookupKind>("email"),
    [selected, setSelected] = useState<User | null>(null),
    [busy, setBusy] = useState(false),
    [operation, setOperation] = useState<
      "ban" | "unban" | "verify" | "delete" | null
    >(null);
  const lookupId = useRef(0);
  useEffect(() => {
    request<User[]>("/v1/user/all")
      .then(setItems)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  async function lookup(value: string, kind: UserLookupKind = "email") {
    const id = ++lookupId.current;
    setBusy(true);
    setError("");
    setSelected(null);
    setOperation(null);
    try {
      const user = await lookupUser(value, kind, (path) => request<User>(path));
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
      <NicknameModeration />
      <ErrorBox error={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(lookupValue, lookupKind);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Field className="sm:max-w-xs">
          <FieldLabel htmlFor="user-lookup-kind">
            Cercar un compte per
          </FieldLabel>
          <select
            id="user-lookup-kind"
            className="h-11 rounded-md border border-input bg-background px-3 text-base"
            value={lookupKind}
            onChange={(event) => {
              setLookupKind(event.target.value as UserLookupKind);
              setLookupValue("");
            }}
          >
            <option value="email">Correu electrònic</option>
            <option value="phone">Telèfon</option>
            <option value="nickname">Àlies</option>
          </select>
        </Field>
        <FieldGroup className="max-w-md">
          <Field>
            <FieldLabel htmlFor="user-lookup-value">
              {lookupKind === "email"
                ? "Correu electrònic"
                : lookupKind === "phone"
                  ? "Telèfon"
                  : "Àlies"}
            </FieldLabel>
            <Input
              id="user-lookup-value"
              type={
                lookupKind === "email"
                  ? "email"
                  : lookupKind === "phone"
                    ? "tel"
                    : "text"
              }
              placeholder={
                lookupKind === "email"
                  ? "participant@exemple.cat"
                  : lookupKind === "phone"
                    ? "+34 600 000 000"
                    : "Àlies exacte"
              }
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
              required
            />
          </Field>
        </FieldGroup>
        <Button disabled={busy || !lookupValue.trim()}>
          {busy ? "Cercant…" : "Consultar el compte"}
        </Button>
      </form>
      {selected && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !operation) {
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
                <UserPasswordReset
                  key={selected.id ?? selected.nickname}
                  user={selected}
                />
                {critical &&
                  selected.is_verified === false &&
                  selected.id != null && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setOperation("verify")}
                    >
                      Verificar compte
                    </Button>
                  )}
                {critical &&
                  selected.type === "hacker" &&
                  selected.id != null && (
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
                      <Button
                        variant="destructive"
                        disabled={busy}
                        onClick={() => setOperation("delete")}
                      >
                        Eliminar compte
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
      <Field className="sm:max-w-md">
        <FieldLabel htmlFor="user-name-filter">
          Filtrar el llistat per nom o àlies
        </FieldLabel>
        <Input
          id="user-name-filter"
          placeholder="Filtrar per nom o àlies…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="sm:max-w-xs"
        />
        <p className="text-sm text-muted-foreground">
          Per correu o telèfon, utilitza la consulta de compte de més amunt.
        </p>
      </Field>
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
          key={`${selected.id}-${operation}`}
          title={`${operation === "delete" ? "Eliminar" : operation === "verify" ? "Verificar" : operation === "ban" ? "Bloquejar" : "Desbloquejar"} ${selected.name}`}
          confirmationText={
            operation === "delete" ? selected.nickname : undefined
          }
          confirmLabel={
            operation === "delete" ? "Eliminar definitivament" : "Confirmar"
          }
          description={
            operation === "delete"
              ? `Eliminaràs definitivament el compte ${selected.nickname} (ID ${selected.id}), amb correu ${selected.email || "no disponible"} i telèfon ${selected.telephone || "no disponible"}. També s’eliminaran les seves inscripcions, participacions i registres d’àpats, i es modificarà la seva pertinença als equips. No es pot desfer. Si l’eliminació es completa, podrà tornar-se a registrar, però haurà de fer de nou la inscripció a l’esdeveniment. Comprova amb la persona que és el compte correcte.`
              : operation === "verify"
                ? `Verificaràs manualment el compte de ${selected.email || selected.nickname}, sense confirmació per correu. Aquesta acció no canvia els permisos ni desbloqueja el compte.`
                : "L'operació canvia l'accés del participant al servidor."
          }
          onClose={() => setOperation(null)}
          onConfirm={async () => {
            if (!critical || selected.id == null)
              throw new Error("No tens permisos per fer aquesta operació.");
            if (operation === "delete") {
              if (selected.type !== "hacker")
                throw new Error(
                  "Només es poden eliminar comptes de participants.",
                );
              const result = await request<{
                success: boolean;
                deleted_id: number;
              }>(`/v1/hacker/${selected.id}`, "DELETE");
              if (result.success !== true || result.deleted_id !== selected.id)
                throw new Error(
                  "No s’ha pogut confirmar l’eliminació. Actualitza el llistat abans de tornar-ho a provar.",
                );
              setItems((current) =>
                current.filter((user) => user.nickname !== selected.nickname),
              );
              setSelected(null);
              setOperation(null);
            } else if (operation === "verify") {
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
