import { Button } from "@/components/ui/button";
export const PAGE_SIZE = 50;
export function SearchPagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      aria-label="Paginació"
    >
      <p className="text-sm text-muted-foreground" role="status">
        {total} {total === 1 ? "resultat" : "resultats"} · Pàgina {page + 1} de{" "}
        {pages}
      </p>
      {pages > 1 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => onChange(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={page >= pages - 1}
            onClick={() => onChange(page + 1)}
          >
            Següent
          </Button>
        </div>
      )}
    </div>
  );
}
