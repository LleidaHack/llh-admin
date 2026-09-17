import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  EditDialog,
  ConfirmDialog,
  EmptyBox,
  ErrorBox,
  Loading,
} from "@/components/shared";
import { request, errorMessage, type Company } from "@/lib/api";
export function Companies() {
  const [items, setItems] = useState<Company[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [edit, setEdit] = useState<Company | "new" | null>(null),
    [remove, setRemove] = useState<Company | null>(null),
    [logo, setLogo] = useState<string | null>(null),
    [query, setQuery] = useState("");
  useEffect(() => {
    setLogo(edit && edit !== "new" ? (edit.image ?? null) : null);
  }, [edit]);
  async function load() {
    try {
      setItems(await request("/v1/company/all"));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow">COL·LABORADORS</p>
          <h1>Empreses</h1>
          <p className="text-muted-foreground">
            Gestiona les empreses i vincula-les a cada edició des del seu
            esdeveniment.
          </p>
        </div>
        <Button onClick={() => setEdit("new")}>
          <Plus data-icon="inline-start" />
          Crear empresa
        </Button>
      </div>
      <ErrorBox error={error} />
      <Input
        aria-label="Cercar empreses"
        placeholder="Cercar empresa…"
        className="sm:max-w-xs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading ? (
        <Loading />
      ) : filtered.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Web</TableHead>
              <TableHead>Nivell</TableHead>
              <TableHead>Telèfon</TableHead>
              <TableHead>Accions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.website || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Nivell {c.tier}</Badge>
                </TableCell>
                <TableCell>{c.telephone || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEdit(c)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRemove(c)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyBox title="No hi ha empreses per mostrar" />
      )}
      {edit && (
        <EditDialog
          title={edit === "new" ? "Crear empresa" : "Editar empresa"}
          description="Dades de contacte i nivell de patrocini."
          fields={[
            { name: "name", label: "Nom", required: true },
            { name: "website", label: "Web", type: "url" },
            {
              name: "tier",
              label: "Nivell",
              type: "number",
              min: 0,
              required: true,
            },
            { name: "telephone", label: "Telèfon" },
            { name: "address", label: "Adreça" },
            { name: "linkdin", label: "LinkedIn", type: "url" },
            { name: "description", label: "Descripció", multiline: true },
          ].map((f) => ({
            ...f,
            value:
              edit === "new"
                ? f.name === "tier"
                  ? 0
                  : ""
                : (edit[f.name as keyof Company] ?? ""),
          }))}
          onClose={() => setEdit(null)}
          onSave={async (f) => {
            const payload = {
              ...Object.fromEntries(f.entries()),
              tier: Number(f.get("tier")),
              image: logo ?? "",
            };
            await request(
              edit === "new" ? "/v1/company/" : `/v1/company/${edit.id}`,
              edit === "new" ? "POST" : "PUT",
              payload,
            );
            await load();
          }}
        >
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Logo</span>
            <div className="flex items-center gap-3">
              {logo && (
                <img
                  src={logo}
                  alt="Logo"
                  className="h-16 w-16 rounded border bg-white object-contain"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setLogo(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              {logo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLogo(null)}
                >
                  Treure
                </Button>
              )}
            </div>
          </div>
        </EditDialog>
      )}
      {remove && (
        <ConfirmDialog
          title={`Eliminar ${remove.name}`}
          description="S'eliminarà l'empresa. Desvincula-la dels seus esdeveniments abans de continuar."
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await request(`/v1/company/${remove.id}`, "DELETE");
            await load();
          }}
        />
      )}
    </div>
  );
}
