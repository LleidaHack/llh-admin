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
    [query, setQuery] = useState("");
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
          <p className="eyebrow">COLABORADORES</p>
          <h1>Empresas</h1>
          <p className="text-muted-foreground">
            Gestiona las empresas y vincúlalas a cada edición desde su evento.
          </p>
        </div>
        <Button onClick={() => setEdit("new")}>
          <Plus data-icon="inline-start" />
          Crear empresa
        </Button>
      </div>
      <ErrorBox error={error} />
      <Input
        aria-label="Buscar empresas"
        placeholder="Buscar empresa…"
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
              <TableHead>Nivel</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.website || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Nivel {c.tier}</Badge>
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
        <EmptyBox title="Sin empresas que mostrar" />
      )}
      {edit && (
        <EditDialog
          title={edit === "new" ? "Crear empresa" : "Editar empresa"}
          description="Datos de contacto y nivel de patrocinio."
          fields={[
            { name: "name", label: "Nombre", required: true },
            { name: "website", label: "Web", type: "url" },
            {
              name: "tier",
              label: "Nivel",
              type: "number",
              min: 0,
              required: true,
            },
            { name: "telephone", label: "Teléfono" },
            { name: "address", label: "Dirección" },
            { name: "linkdin", label: "LinkedIn", type: "url" },
            { name: "description", label: "Descripción", multiline: true },
          ].map((f) => ({
            ...f,
            value:
              edit === "new"
                ? f.name === "tier"
                  ? 0
                  : ""
                : edit[f.name as keyof Company],
          }))}
          onClose={() => setEdit(null)}
          onSave={async (f) => {
            const payload = {
              ...Object.fromEntries(f.entries()),
              tier: Number(f.get("tier")),
            };
            await request(
              edit === "new" ? "/v1/company/" : `/v1/company/${edit.id}`,
              edit === "new" ? "POST" : "PUT",
              payload,
            );
            await load();
          }}
        />
      )}
      {remove && (
        <ConfirmDialog
          title={`Eliminar ${remove.name}`}
          description="Se eliminará la empresa. Desvincúlala de sus eventos antes de continuar."
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
