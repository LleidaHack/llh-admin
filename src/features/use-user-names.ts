import { useEffect, useRef, useState } from "react";
import { request } from "@/lib/api";

// Resolves organizer ids to names for notes and the audit log, once per id.
export function useUserNames(ids: (number | null | undefined)[]) {
  const requested = useRef(new Set<number>());
  const [names, setNames] = useState<Record<number, string>>({});
  const key = [...new Set(ids.filter((id): id is number => id != null))]
    .sort((a, b) => a - b)
    .join(",");
  useEffect(() => {
    if (!key) return;
    for (const id of key.split(",").map(Number)) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      void request<{ name: string }>(`/v1/user/${id}`)
        .then((user) =>
          setNames((current) => ({ ...current, [id]: user.name })),
        )
        .catch(() => requested.current.delete(id));
    }
  }, [key]);
  return names;
}
