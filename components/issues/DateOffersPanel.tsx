"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Users, CalendarDays, ChevronLeft } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import AvatarInitials from "../ui/AvatarInitials";
import { cn } from "../../lib/utils";
import { useAuth } from "../../lib/hooks/useAuth";
import { toast } from "sonner";

interface HelpOfferComment {
  id: number;
  offer_id: number;
  user_id: string;
  body: string;
  created_at?: string;
  profiles?: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}

interface HelpOffer {
  id: number;
  user_id: string;
  note: string | null;
  service_date: string | null;
  vote_count: number;
  voted_by_me: boolean;
  comments: HelpOfferComment[];
  profiles?: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}

interface Props {
  issueId: number;
  issueTitle: string;
  userId?: string;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    weekday: dt.toLocaleDateString("mk-MK", { weekday: "long" }),
    dayMonth: dt.toLocaleDateString("mk-MK", { day: "numeric", month: "long" }),
    year: dt.getFullYear(),
  };
}

export default function DateOffersPanel({ issueId, issueTitle, userId, onClose }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { profile: authProfile } = useAuth();
  const [offers, setOffers] = useState<HelpOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingFor, setVotingFor] = useState<number | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [savingFor, setSavingFor] = useState<number | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  async function loadOffers() {
    const { data: offersData, error } = await supabase
      .from("issue_help_offers")
      .select("id, user_id, note, service_date, profiles:user_id(full_name, avatar_url, username)")
      .eq("issue_id", issueId)
      .not("service_date", "is", null)
      .order("created_at", { ascending: true });

    if (error || !offersData) { setLoading(false); return; }

    const offerIds = offersData.map((o) => o.id);
    let voteRows: { offer_id: number; user_id: string }[] = [];
    let commentRows: (HelpOfferComment & { profiles: unknown })[] = [];

    if (offerIds.length > 0) {
      const [{ data: votes }, { data: comments }] = await Promise.all([
        supabase.from("issue_help_date_votes").select("offer_id, user_id").in("offer_id", offerIds),
        supabase.from("issue_help_offer_comments")
          .select("id, offer_id, user_id, body, created_at, profiles:user_id(full_name, avatar_url, username)")
          .in("offer_id", offerIds)
          .order("created_at", { ascending: true }),
      ]);
      voteRows = votes ?? [];
      commentRows = (comments ?? []) as typeof commentRows;
    }

    const voteCount: Record<number, number> = {};
    const votedByMe = new Set<number>();
    for (const v of voteRows) {
      voteCount[v.offer_id] = (voteCount[v.offer_id] ?? 0) + 1;
      if (v.user_id === userId) votedByMe.add(v.offer_id);
    }

    const commentsByOffer: Record<number, HelpOfferComment[]> = {};
    for (const c of commentRows) {
      commentsByOffer[c.offer_id] ??= [];
      commentsByOffer[c.offer_id].push({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : (c.profiles as HelpOfferComment["profiles"]),
      });
    }

    setOffers(
      offersData.map((o) => ({
        id: o.id,
        user_id: o.user_id,
        note: o.note,
        service_date: o.service_date,
        vote_count: voteCount[o.id] ?? 0,
        voted_by_me: votedByMe.has(o.id),
        comments: commentsByOffer[o.id] ?? [],
        profiles: Array.isArray(o.profiles) ? o.profiles[0] : o.profiles,
      })),
    );
    setLoading(false);
  }

  useEffect(() => { loadOffers(); }, [issueId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleVote(offer: HelpOffer) {
    if (!userId) { toast.error("Најавете се прво"); return; }
    if (votingFor) return;
    setVotingFor(offer.id);
    if (offer.voted_by_me) {
      await supabase.from("issue_help_date_votes").delete().eq("offer_id", offer.id).eq("user_id", userId);
    } else {
      await supabase.from("issue_help_date_votes").insert({ offer_id: offer.id, user_id: userId });
      // Also register as helper
      await supabase.from("issue_helpers").upsert({ issue_id: issueId, user_id: userId }, { onConflict: "issue_id,user_id" });
    }
    await loadOffers();
    setVotingFor(null);
  }

  async function submitComment(offerId: number) {
    const body = (commentDrafts[offerId] ?? "").trim();
    if (!body || !userId || savingFor) return;
    setSavingFor(offerId);
    const { error } = await supabase.from("issue_help_offer_comments").insert({ offer_id: offerId, user_id: userId, body });
    if (error) { toast.error(error.message); setSavingFor(null); return; }
    setCommentDrafts((prev) => ({ ...prev, [offerId]: "" }));
    await loadOffers();
    setSavingFor(null);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-4 shrink-0">
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-teal-600 shrink-0" />
            <p className="text-sm font-semibold text-zinc-800">Предложени датуми</p>
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              offers.length >= 3 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"
            )}>
              {offers.length}/3
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{issueTitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-0 divide-y divide-zinc-100">
        {loading && (
          <div className="space-y-3 p-4">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />)}
          </div>
        )}

        {!loading && offers.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
            <CalendarDays size={40} className="text-zinc-200" />
            <p className="text-sm font-medium text-zinc-400">Нема предложени датуми</p>
            <p className="text-xs text-zinc-300">Кликни Помогни за да предложиш датум за акција.</p>
          </div>
        )}

        {offers.map((offer) => {
          const name = offer.profiles?.full_name ?? offer.profiles?.username ?? "Анонимно";
          const isOwn = offer.user_id === userId;
          const { weekday, dayMonth, year } = formatDate(offer.service_date!);

          return (
            <div key={offer.id}>
              {/* Date hero */}
              <div className={cn(
                "flex items-center justify-between gap-4 px-5 py-4",
                offer.voted_by_me ? "bg-teal-600" : "bg-zinc-800"
              )}>
                <div className="text-white">
                  <p className="text-[11px] font-medium capitalize opacity-70">{weekday}</p>
                  <p className="text-2xl font-bold leading-tight">{dayMonth}</p>
                  <p className="text-[11px] opacity-50 mt-0.5">{year}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white">{name}</p>
                    <p className="text-[10px] text-white/60">предложил/а</p>
                    {offer.vote_count > 0 && (
                      <p className="text-[10px] text-white/70 mt-0.5">
                        {offer.vote_count} {offer.vote_count === 1 ? "учесник" : "учесници"}
                      </p>
                    )}
                  </div>
                  <AvatarInitials
                    name={name}
                    avatarUrl={offer.profiles?.avatar_url ?? null}
                    size="md"
                    className="ring-2 ring-white/30"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-3 space-y-3">
                {offer.note && (
                  <p className="text-sm text-zinc-600 leading-relaxed">{offer.note}</p>
                )}

                {/* Join button */}
                {!isOwn && (
                  <button
                    onClick={() => toggleVote(offer)}
                    disabled={!!votingFor}
                    className={cn(
                      "w-full rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
                      offer.voted_by_me
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : "bg-white border-2 border-teal-300 text-teal-700 hover:bg-teal-50",
                    )}>
                    {offer.voted_by_me ? "✓ Идам на оваа акција" : "Идам и јас"}
                  </button>
                )}
                {isOwn && (
                  <div className="rounded-xl bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-400">
                    Твој предлог
                  </div>
                )}

                {/* Comments */}
                {offer.comments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {offer.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <AvatarInitials
                          name={c.profiles?.full_name ?? c.profiles?.username ?? "?"}
                          avatarUrl={c.profiles?.avatar_url ?? null}
                          size="sm"
                          className="shrink-0 mt-0.5"
                        />
                        <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm">
                          <p className="text-[11px] font-semibold text-zinc-700">
                            {c.profiles?.full_name ?? c.profiles?.username ?? "Анонимно"}
                          </p>
                          <p className="text-zinc-700 leading-snug">{c.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                {userId ? (
                  <div className="flex items-center gap-2">
                    <AvatarInitials
                      name={authProfile?.full_name ?? authProfile?.username ?? null}
                      avatarUrl={authProfile?.avatar_url ?? null}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="flex flex-1 items-center rounded-2xl bg-zinc-100 pl-3 pr-1.5 py-1.5 gap-2">
                      <input
                        ref={(el) => { inputRefs.current[offer.id] = el; }}
                        value={commentDrafts[offer.id] ?? ""}
                        onChange={(e) => setCommentDrafts((p) => ({ ...p, [offer.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && (commentDrafts[offer.id] ?? "").trim()) { e.preventDefault(); submitComment(offer.id); } }}
                        placeholder="Коментирај…"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                      />
                      <button
                        onClick={() => submitComment(offer.id)}
                        disabled={savingFor === offer.id || !(commentDrafts[offer.id] ?? "").trim()}
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
                          (commentDrafts[offer.id] ?? "").trim()
                            ? "bg-[#427FFF] text-white hover:bg-[#3570ee]"
                            : "bg-zinc-200 text-zinc-400 cursor-default",
                        )}>
                        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
                          <path d="m16.5656 45.5515-11.78364-6.267c-3.67422-1.9541-3.71814-7.2034-.07711-9.2187l49.50775-27.40232c3.8263-2.117817 8.4128 1.10184 7.7186 5.42067l-7.9566 49.50095c-.5709 3.5515-4.466 5.4869-7.6415 3.798l-10.9257-5.8107-3.3381 3.3377c-2.9508 2.9504-7.9992 1.4408-8.8448-2.6459l-1.6068-7.765 17.3823-21.4992z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-zinc-400">Најавете се за да коментирате</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
