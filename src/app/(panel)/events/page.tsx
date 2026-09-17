"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBox, Loading } from "@/components/shared";
import { Events } from "@/features/events";
import { request, errorMessage, type EventRecord } from "@/lib/api";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    void load();
  }, [load]);

  return (
    <>
      <ErrorBox error={error} />
      {error && (
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw data-icon="inline-start" />
          Tornar-ho a provar
        </Button>
      )}
      {loading ? (
        <Loading />
      ) : (
        <Events
          events={events}
          onSelect={(id) => router.push(`/events/${id}`)}
          reload={load}
        />
      )}
    </>
  );
}
