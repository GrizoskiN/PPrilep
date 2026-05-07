"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "../supabase/client";
import type { Issue, District, Category, IssueStatus } from "../types/database";

const PAGE_SIZE = 6;

interface UseIssuesOptions {
  district?: District | "all";
  category?: Category | "all";
  status?: IssueStatus | "all";
  userId?: string;
}

export function useIssues(opts: UseIssuesOptions = {}) {
  const supabase = useRef(createClient()).current;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  // Bulk-enrich a batch — 2-4 queries regardless of batch size
  async function enrichBatch(data: Issue[]): Promise<Issue[]> {
    if (data.length === 0) return [];
    const ids = data.map((i) => i.id);

    const queries = [
      supabase.from("issue_affected").select("issue_id").in("issue_id", ids),
      supabase.from("issue_helpers").select("issue_id").in("issue_id", ids),
    ];

    if (opts.userId) {
      queries.push(
        supabase.from("issue_affected").select("issue_id").in("issue_id", ids).eq("user_id", opts.userId),
        supabase.from("issue_helpers").select("issue_id").in("issue_id", ids).eq("user_id", opts.userId),
      );
    }

    const results = await Promise.all(queries);
    const [{ data: affected }, { data: helpers }] = results as [
      { data: { issue_id: number }[] | null },
      { data: { issue_id: number }[] | null },
    ];
    const userAffected = opts.userId ? (results[2] as { data: { issue_id: number }[] | null }).data : null;
    const userHelpers  = opts.userId ? (results[3] as { data: { issue_id: number }[] | null }).data : null;

    const affMap: Record<number, number> = {};
    const helMap: Record<number, number> = {};
    for (const r of affected ?? []) affMap[r.issue_id] = (affMap[r.issue_id] ?? 0) + 1;
    for (const r of helpers  ?? []) helMap[r.issue_id] = (helMap[r.issue_id] ?? 0) + 1;

    const userAffSet = new Set(userAffected?.map((r) => r.issue_id) ?? []);
    const userHelSet = new Set(userHelpers?.map((r) => r.issue_id) ?? []);

    return data.map((i) => ({
      ...i,
      affected_count: affMap[i.id] ?? 0,
      helper_count:   helMap[i.id] ?? 0,
      is_affected: userAffSet.has(i.id),
      is_helper:   userHelSet.has(i.id),
    }));
  }

  function buildQuery(offset: number) {
    let q = supabase
      .from("issues")
      .select(`*, profiles:reported_by(id, full_name, avatar_url, username)`)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (opts.district && opts.district !== "all") q = q.eq("district", opts.district);
    if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
    if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);

    return q;
  }

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    offsetRef.current = 0;

    const { data, error: fetchError } = await buildQuery(0);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const enriched = await enrichBatch((data as Issue[]) ?? []);
    setIssues(enriched);
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    offsetRef.current = data?.length ?? 0;
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.district, opts.category, opts.status]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const { data, error: fetchError } = await buildQuery(offsetRef.current);

    if (!fetchError && data) {
      const enriched = await enrichBatch(data as Issue[]);
      setIssues((prev) => [...prev, ...enriched]);
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current += data.length;
    }
    setLoadingMore(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, opts.district, opts.category, opts.status]);

  useEffect(() => {
    fetchInitial();

    const channel = supabase
      .channel(`issues-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("issues")
              .select(`*, profiles:reported_by(id, full_name, avatar_url, username)`)
              .eq("id", (payload.new as Issue).id)
              .single();
            if (data) {
              const [enriched] = await enrichBatch([data as Issue]);
              setIssues((prev) => [enriched, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            setIssues((prev) =>
              prev.map((i) =>
                i.id === (payload.new as Issue).id ? { ...i, ...(payload.new as Issue) } : i,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setIssues((prev) => prev.filter((i) => i.id !== (payload.old as Issue).id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitial]);

  return { issues, loading, loadingMore, hasMore, error, fetchMore, refetch: fetchInitial };
}
