"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { EventDetail } from "@/features/event-detail";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const eventId = Number(id);

  return (
    <EventDetail
      id={eventId}
      onBack={() => router.push("/events")}
      reloadEvents={async () => {}}
    />
  );
}
