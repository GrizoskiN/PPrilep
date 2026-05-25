"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "../supabase/client";

interface SyncPayload {
  vote_count: number;
  stage: string;
}

/**
 * Subscribe to realtime updates for a single initiative row and forward
 * any vote_count / stage change to the caller. Only meant for cards in the
 * `idea` or `voting` tabs — `funding` and `completed` don't need it.
 */
export function useInitiativeVoteSync(
  initiativeId: string,
  enabled: boolean,
  onChange: (next: SyncPayload) => void,
) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`initiative:${initiativeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "initiatives",
          filter: `id=eq.${initiativeId}`,
        },
        (payload) => {
          const row = payload.new as { vote_count?: number; stage?: string };
          if (row?.vote_count != null && row?.stage != null) {
            onChange({ vote_count: row.vote_count, stage: row.stage });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initiativeId, enabled, onChange]);
}
