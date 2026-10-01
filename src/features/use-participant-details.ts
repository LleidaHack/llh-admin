import { useEffect, useRef, useState } from "react";
import {
  loadParticipantProfile,
  errorMessage,
  type HackerProfile,
  type Participant,
} from "@/lib/api";

// Limit legacy API enrichment to the visible page, using six workers. Cache within this mounted event view, never across user sessions.
export function useParticipantDetails(eventId: number, visible: Participant[]) {
  const cache = useRef(new Map<string, Promise<HackerProfile>>());
  const [details, setDetails] = useState<Record<string, HackerProfile>>({});
  const [failures, setFailures] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    let cursor = 0;
    const missing = visible.filter(
      (p) => p.cv === undefined || p.study_center === undefined,
    );
    async function worker() {
      while (active && cursor < missing.length) {
        const participant = missing[cursor++];
        const key = `${eventId}:${participant.id}`;
        try {
          let pending = cache.current.get(key);
          if (!pending) {
            pending = loadParticipantProfile(eventId, participant.id);
            cache.current.set(key, pending);
          }
          const profile = await pending;
          if (active) {
            setDetails((current) => ({ ...current, [key]: profile }));
            setFailures((current) => ({ ...current, [key]: "" }));
          }
        } catch (error) {
          cache.current.delete(key);
          if (active)
            setFailures((current) => ({
              ...current,
              [key]: errorMessage(error),
            }));
        }
      }
    }
    void Promise.all(
      Array.from({ length: Math.min(6, missing.length) }, worker),
    );
    return () => {
      active = false;
    };
  }, [eventId, visible]);
  return visible.map((participant) => {
    const key = `${eventId}:${participant.id}`;
    const profile = details[key];
    return {
      ...participant,
      cv: participant.cv === undefined ? profile?.cv : participant.cv,
      study_center:
        participant.study_center === undefined
          ? profile?.study_center
          : participant.study_center,
      detailsError: failures[key],
      detailsLoading:
        !profile &&
        !failures[key] &&
        (participant.cv === undefined ||
          participant.study_center === undefined),
    };
  });
}
