"use client";

import { useEffect, useMemo, useState } from "react";
import { X, HandHelping, CalendarDays, Clock, Users } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import Button from "../ui/Button";
import AvatarInitials from "../ui/AvatarInitials";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface DateOffer {
  id: number;
  user_id: string;
  note: string | null;
  service_date: string | null;
  vote_count: number;
  voted_by_me: boolean;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface Props {
  issueId: number;
  issueTitle: string;
  userId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  // service_date is a Postgres `date` column → always YYYY-MM-DD
  // Parse as local date to avoid UTC offset shifting the day
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString("mk-MK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HelperModal({
  issueId,
  issueTitle,
  userId,
  onClose,
  onSuccess,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [note, setNote] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTime, setServiceTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateOffers, setDateOffers] = useState<DateOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [joiningOffer, setJoiningOffer] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Gracefully handle missing table (42P01)
      const { data: offersData, error } = await supabase
        .from("issue_help_offers")
        .select(
          "id, user_id, note, service_date, profiles:user_id(full_name, avatar_url, username)",
        )
        .eq("issue_id", issueId)
        .not("service_date", "is", null)
        .order("created_at", { ascending: true });

      if (!mounted) return;
      if (error || !offersData) { setLoadingOffers(false); return; }

      const offerIds = offersData.map((o) => o.id);
      let voteRows: Array<{ offer_id: number; user_id: string }> = [];

      if (offerIds.length > 0) {
        const { data: votesData } = await supabase
          .from("issue_help_date_votes")
          .select("offer_id, user_id")
          .in("offer_id", offerIds);
        voteRows = votesData ?? [];
      }

      const voteCount: Record<number, number> = {};
      const votedByMe = new Set<number>();
      for (const v of voteRows) {
        voteCount[v.offer_id] = (voteCount[v.offer_id] ?? 0) + 1;
        if (v.user_id === userId) votedByMe.add(v.offer_id);
      }

      setDateOffers(
        offersData.map((o) => ({
          id: o.id,
          user_id: o.user_id,
          note: o.note,
          service_date: o.service_date,
          vote_count: voteCount[o.id] ?? 0,
          voted_by_me: votedByMe.has(o.id),
          profiles: Array.isArray(o.profiles) ? o.profiles[0] : o.profiles,
        })),
      );
      setLoadingOffers(false);
    }

    load();
    return () => { mounted = false; };
  }, [issueId, supabase, userId]);

  async function joinOffer(offer: DateOffer) {
    if (joiningOffer) return;
    setJoiningOffer(offer.id);

    await supabase.from("issue_helpers").upsert(
      {
        issue_id: issueId,
        user_id: userId,
        note: `Се придружувам — ${formatDateTime(offer.service_date)}`,
      },
      { onConflict: "issue_id,user_id" },
    );

    if (!offer.voted_by_me) {
      await supabase
        .from("issue_help_date_votes")
        .insert({ offer_id: offer.id, user_id: userId });
    }

    const { count } = await supabase
      .from("issue_helpers")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId);

    toast.success("Се придруживте на акцијата!");
    onSuccess(count ?? 0);
  }

  async function submit() {
    setLoading(true);

    // service_date column is Postgres `date` type — only accepts YYYY-MM-DD.
    // Fold the time into the note so it isn't lost.
    const serviceDay = serviceDate || null; // "2025-05-20" or null
    const noteWithTime =
      note.trim()
        ? serviceTime ? `${note.trim()} (${serviceTime}ч)` : note.trim()
        : serviceTime ? `Предложена акција во ${serviceTime}ч` : null;

    const { error } = await supabase.from("issue_helpers").upsert(
      { issue_id: issueId, user_id: userId, note: noteWithTime },
      { onConflict: "issue_id,user_id" },
    );

    if (error) { toast.error(error.message); setLoading(false); return; }

    const { error: offerError } = await supabase.from("issue_help_offers").upsert(
      {
        issue_id: issueId,
        user_id: userId,
        note: noteWithTime,
        service_date: serviceDay,
      },
      { onConflict: "issue_id,user_id" },
    );

    if (offerError && offerError.code !== "42P01") {
      // Translate the trigger's Macedonian message, or show generic fallback
      const msg = offerError.message?.includes("Максималниот")
        ? "Максималниот број на предлог датуми е достигнат."
        : offerError.message?.includes("first helper")
          ? "Максималниот број на предлог датуми е достигнат."
          : offerError.message;
      toast.error(msg);
      setLoading(false);
      return;
    }

    const { count } = await supabase
      .from("issue_helpers")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId);

    toast.success("Се пријавивте да помогнете!");
    onSuccess(count ?? 0);
  }

  const hasDate = !!serviceDate;
  const showDateOffers = !loadingOffers; // always show once loaded

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2">
            <HandHelping size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold">Понудете помош</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Issue label */}
          <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">
              Пријава
            </p>
            <p className="text-sm font-semibold text-zinc-800 line-clamp-2">
              {issueTitle}
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-zinc-700">
              Опишете како можете да помогнете{" "}
              <span className="font-normal text-zinc-400">(незадолжително)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="На пример: Имам опрема за поправка на коловоз и слободно викенд. Може да организираме волонтерска акција..."
              className="mt-1.5 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none transition-colors"
            />
            <p className="text-[10px] text-zinc-400 text-right mt-0.5">
              {note.length}/500
            </p>
          </div>

          {/* Date + Time */}
          <div>
            <label className="text-xs font-semibold text-zinc-700">
              Предложете датум за акција{" "}
              <span className="font-normal text-zinc-400">(опционално)</span>
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <div className="relative">
                <CalendarDays
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors"
                />
              </div>
              <div className="relative">
                <Clock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                />
                <input
                  type="time"
                  value={serviceTime}
                  onChange={(e) => setServiceTime(e.target.value)}
                  disabled={!serviceDate}
                  className="w-full border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors disabled:bg-zinc-50 disabled:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* ── Предложени датуми ─────────────────── */}
          {showDateOffers && (
            <div
              className={cn(
                "rounded-xl border overflow-hidden",
                hasDate ? "border-teal-200" : "border-zinc-200",
              )}>
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 border-b",
                  hasDate
                    ? "bg-teal-50 border-teal-200"
                    : "bg-zinc-50 border-zinc-200",
                )}>
                <Users size={13} className="text-teal-600" />
                <p className="text-xs font-semibold text-zinc-700">
                  Предложени датуми
                </p>
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                  {dateOffers.length}/3
                </span>
                {dateOffers.length >= 3 && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    Пополнето
                  </span>
                )}
              </div>

              {dateOffers.length === 0 ? (
                <p className="px-4 py-4 text-xs text-zinc-400 italic">
                  Сe уште нема предложени датуми — биди прв!
                </p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {dateOffers.map((offer) => {
                    const name =
                      offer.profiles?.full_name ??
                      offer.profiles?.username ??
                      "Анонимно";
                    const isOwn = offer.user_id === userId;

                    const [oy, om, od] = (offer.service_date as string).split("-").map(Number);
                    const dateObj = new Date(oy, om - 1, od);
                    const dayName = dateObj.toLocaleDateString("mk-MK", { weekday: "long" });
                    const dayNum  = dateObj.toLocaleDateString("mk-MK", { day: "numeric", month: "long", year: "numeric" });

                    return (
                      <div key={offer.id}
                        className={cn(
                          "overflow-hidden rounded-xl border",
                          offer.voted_by_me ? "border-teal-300" : "border-zinc-200"
                        )}>
                        {/* Date hero row */}
                        <div className={cn(
                          "flex items-center justify-between gap-2 px-4 py-2.5",
                          offer.voted_by_me ? "bg-teal-600" : "bg-zinc-800"
                        )}>
                          <div className="text-white min-w-0">
                            <p className="text-[10px] opacity-60 capitalize">{dayName}</p>
                            <p className="text-sm font-bold leading-tight">{dayNum}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <AvatarInitials name={name} avatarUrl={offer.profiles?.avatar_url ?? null} size="sm" className="ring-2 ring-white/30" />
                            <p className="text-[11px] text-white/80 font-medium truncate max-w-20">{name}</p>
                          </div>
                        </div>
                        {/* Note + action */}
                        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                          <p className="text-xs text-zinc-500 truncate flex-1">
                            {offer.note || (offer.vote_count > 0 ? `${offer.vote_count} учесн.` : "Нема коментар")}
                          </p>
                          <button
                            onClick={() => joinOffer(offer)}
                            disabled={!!joiningOffer || isOwn || offer.voted_by_me}
                            className={cn(
                              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all whitespace-nowrap active:scale-95",
                              offer.voted_by_me
                                ? "bg-teal-600 text-white"
                                : isOwn
                                  ? "bg-zinc-100 text-zinc-400 cursor-default"
                                  : "bg-white border border-teal-300 text-teal-700 hover:bg-teal-50",
                            )}>
                            {offer.voted_by_me ? "✓ Идам" : isOwn ? "Твој предлог" : "Идам и јас"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-100 bg-zinc-50/50 shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Откажи
          </Button>
          <Button variant="teal" onClick={submit} disabled={loading}>
            {loading ? "Се пријавува…" : "Пријави се"}
          </Button>
        </div>
      </div>
    </div>
  );
}
