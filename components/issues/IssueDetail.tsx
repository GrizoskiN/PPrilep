"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Share2, MapPin, MessageCircle, Pencil, Trash2 } from "lucide-react";
import StatusPill from "../ui/StatusPill";
import AvatarInitials from "../ui/AvatarInitials";
import {
  formatDays,
  districtColor,
  categoryIcon,
  cn,
  DISTRICT_LABELS,
  CATEGORY_LABELS,
  getIssuePath,
} from "../../lib/utils";
import type { Issue } from "../../lib/types/database";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";

interface Props {
  issue: Issue;
  userId?: string;
  onClose?: () => void;
  variant?: "full" | "engagement";
}

interface IssueComment {
  id: number;
  user_id: string;
  body: string;
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface HelpOfferComment {
  id: number;
  offer_id: number;
  user_id: string;
  body: string;
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface HelpOffer {
  id: number;
  issue_id: number;
  user_id: string;
  note: string | null;
  service_date: string | null;
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
  vote_count: number;
  voted_by_me: boolean;
  comments: HelpOfferComment[];
}

type HelpOfferCommentRow = {
  id: number;
  offer_id: number;
  user_id: string;
  body: string;
  created_at?: string;
  profiles?:
    | {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      }
    | {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      }[]
    | null;
};

export default function IssueDetail({
  issue,
  userId,
  onClose,
  variant = "full",
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  function redirectToAuth() {
    const next = `${location.pathname}${location.search}`;
    location.href = `/auth/login?next=${encodeURIComponent(next)}`;
  }

  const [currentIssue, setCurrentIssue] = useState<Issue>(issue);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editDescription, setEditDescription] = useState(
    issue.description ?? "",
  );
  const [editStreet, setEditStreet] = useState(issue.street_name ?? "");
  const [savingIssue, setSavingIssue] = useState(false);
  const [deletingIssue, setDeletingIssue] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [commentsUnavailable, setCommentsUnavailable] = useState(false);
  const [helpOffers, setHelpOffers] = useState<HelpOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offersUnavailable, setOffersUnavailable] = useState(false);
  const [offerCommentDrafts, setOfferCommentDrafts] = useState<
    Record<number, string>
  >({});
  const [savingOfferCommentFor, setSavingOfferCommentFor] = useState<
    number | null
  >(null);
  const [votingForOffer, setVotingForOffer] = useState<number | null>(null);

  const isOwner = Boolean(userId && currentIssue.reported_by === userId);

  useEffect(() => {
    setCurrentIssue(issue);
    setEditTitle(issue.title);
    setEditDescription(issue.description ?? "");
    setEditStreet(issue.street_name ?? "");
    setIsEditing(false);
  }, [issue]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${location.origin}${getIssuePath(currentIssue.id, currentIssue.title)}`
      : "";
  const issuePath = getIssuePath(currentIssue.id, currentIssue.title);

  async function loadComments() {
    setLoadingComments(true);

    const { data, error } = await supabase
      .from("issue_comments")
      .select(
        "id, user_id, body, created_at, profiles(full_name, avatar_url, username)",
      )
      .eq("issue_id", currentIssue.id)
      .order("created_at", { ascending: false });

    if (error) {
      setLoadingComments(false);
      if (error.code === "42P01") {
        setCommentsUnavailable(true);
      }
      return;
    }

    const normalized = (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      body: row.body,
      created_at: (row as { created_at?: string }).created_at,
      profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
    })) as IssueComment[];

    setCommentsUnavailable(false);
    setComments(normalized);
    setLoadingComments(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadComments();
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIssue.id]);

  async function loadHelpOffers() {
    setLoadingOffers(true);

    const { data: offersData, error: offersError } = await supabase
      .from("issue_help_offers")
      .select(
        "id, issue_id, user_id, note, service_date, created_at, profiles(full_name, avatar_url, username)",
      )
      .eq("issue_id", currentIssue.id)
      .order("created_at", { ascending: true });

    if (offersError) {
      setLoadingOffers(false);
      if (offersError.code === "42P01") {
        setOffersUnavailable(true);
      }
      return;
    }

    const offers = (offersData ?? []) as Array<{
      id: number;
      issue_id: number;
      user_id: string;
      note: string | null;
      service_date: string | null;
      created_at?: string;
      profiles?:
        | {
            full_name: string | null;
            avatar_url: string | null;
            username: string | null;
          }
        | {
            full_name: string | null;
            avatar_url: string | null;
            username: string | null;
          }[]
        | null;
    }>;

    const offerIds = offers.map((offer) => offer.id);

    let voteRows: Array<{ offer_id: number; user_id: string }> = [];
    let offerCommentsRows: HelpOfferComment[] = [];

    if (offerIds.length > 0) {
      const [{ data: votesData }, { data: commentsData }] = await Promise.all([
        supabase
          .from("issue_help_date_votes")
          .select("offer_id, user_id")
          .in("offer_id", offerIds),
        supabase
          .from("issue_help_offer_comments")
          .select(
            "id, offer_id, user_id, body, created_at, profiles(full_name, avatar_url, username)",
          )
          .in("offer_id", offerIds)
          .order("created_at", { ascending: true }),
      ]);

      voteRows = (votesData ?? []) as Array<{
        offer_id: number;
        user_id: string;
      }>;
      const rawCommentRows = (commentsData ?? []) as HelpOfferCommentRow[];
      offerCommentsRows = rawCommentRows.map((comment) => ({
        ...comment,
        profiles: Array.isArray(comment.profiles)
          ? comment.profiles[0]
          : comment.profiles,
      }));
    }

    const voteCountByOffer: Record<number, number> = {};
    const votedByMe = new Set<number>();
    for (const vote of voteRows) {
      voteCountByOffer[vote.offer_id] =
        (voteCountByOffer[vote.offer_id] ?? 0) + 1;
      if (userId && vote.user_id === userId) votedByMe.add(vote.offer_id);
    }

    const commentsByOffer: Record<number, HelpOfferComment[]> = {};
    for (const comment of offerCommentsRows) {
      commentsByOffer[comment.offer_id] =
        commentsByOffer[comment.offer_id] ?? [];
      commentsByOffer[comment.offer_id].push(comment);
    }

    const normalizedOffers: HelpOffer[] = offers.map((offer) => ({
      id: offer.id,
      issue_id: offer.issue_id,
      user_id: offer.user_id,
      note: offer.note,
      service_date: offer.service_date,
      created_at: offer.created_at,
      profiles: Array.isArray(offer.profiles)
        ? offer.profiles[0]
        : offer.profiles,
      vote_count: voteCountByOffer[offer.id] ?? 0,
      voted_by_me: votedByMe.has(offer.id),
      comments: commentsByOffer[offer.id] ?? [],
    }));

    setOffersUnavailable(false);
    setHelpOffers(normalizedOffers);
    setLoadingOffers(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHelpOffers();
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIssue.id, userId]);

  async function toggleOfferVote(offer: HelpOffer) {
    if (!userId) {
      redirectToAuth();
      return;
    }
    if (!offer.service_date) {
      toast.error("Овој помошник нема предложен датум");
      return;
    }
    if (votingForOffer) return;

    setVotingForOffer(offer.id);
    if (offer.voted_by_me) {
      const { error } = await supabase
        .from("issue_help_date_votes")
        .delete()
        .eq("offer_id", offer.id)
        .eq("user_id", userId);
      if (error) {
        toast.error(error.message);
        setVotingForOffer(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from("issue_help_date_votes")
        .insert({ offer_id: offer.id, user_id: userId });
      if (error) {
        toast.error(error.message);
        setVotingForOffer(null);
        return;
      }
    }

    await loadHelpOffers();
    setVotingForOffer(null);
  }

  async function submitOfferComment(offerId: number) {
    const body = (offerCommentDrafts[offerId] ?? "").trim();
    if (!userId) {
      redirectToAuth();
      return;
    }
    if (!body) return;

    setSavingOfferCommentFor(offerId);
    const { error } = await supabase
      .from("issue_help_offer_comments")
      .insert({ offer_id: offerId, user_id: userId, body });

    if (error) {
      toast.error(error.message);
      setSavingOfferCommentFor(null);
      return;
    }

    setOfferCommentDrafts((prev) => ({ ...prev, [offerId]: "" }));
    await loadHelpOffers();
    setSavingOfferCommentFor(null);
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Линкот е копиран!");
  }

  function openShareWindow(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareFacebook() {
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    );
  }

  function shareWhatsApp() {
    const text = `${currentIssue.title} - ${shareUrl}`;
    openShareWindow(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  function shareViber() {
    const text = `${currentIssue.title} - ${shareUrl}`;
    openShareWindow(`viber://forward?text=${encodeURIComponent(text)}`);
  }

  function shareInstagram() {
    copyLink();
    openShareWindow("https://www.instagram.com/");
    toast.message(
      "Линкот е копиран. Вметнете го во Instagram порака или story.",
    );
  }

  async function saveIssueEdits() {
    if (!isOwner || !userId) return;

    const title = editTitle.trim();
    if (title.length < 4) {
      toast.error("Насловот мора да има барем 4 знаци");
      return;
    }

    setSavingIssue(true);

    const payload = {
      title,
      description: editDescription.trim() || null,
      street_name: editStreet.trim() || null,
    };

    const { data, error } = await supabase
      .from("issues")
      .update(payload)
      .eq("id", currentIssue.id)
      .eq("reported_by", userId)
      .select("*, profiles:reported_by(id, full_name, avatar_url, username)")
      .single();

    if (error) {
      toast.error(error.message);
      setSavingIssue(false);
      return;
    }

    setCurrentIssue((prev) => ({ ...prev, ...data }) as Issue);
    setIsEditing(false);
    setSavingIssue(false);
    toast.success("Пријавата е ажурирана");
  }

  async function deleteIssue() {
    if (!isOwner || !userId || deletingIssue) return;

    const ok = window.confirm(
      "Дали сигурно сакаш да ја избришеш оваа пријава?",
    );
    if (!ok) return;

    setDeletingIssue(true);

    const { error } = await supabase
      .from("issues")
      .delete()
      .eq("id", currentIssue.id)
      .eq("reported_by", userId);

    if (error) {
      toast.error(error.message);
      setDeletingIssue(false);
      return;
    }

    toast.success("Пријавата е избришана");
    onClose?.();

    if (typeof window !== "undefined") {
      window.location.href = "/issues";
    }
  }

  async function submitComment() {
    const body = commentText.trim();
    if (!userId) {
      redirectToAuth();
      return;
    }
    if (!body) return;

    setSavingComment(true);

    const { error } = await supabase
      .from("issue_comments")
      .insert({ issue_id: currentIssue.id, user_id: userId, body });

    if (error) {
      if (error.code === "42P01") {
        toast.error(
          "Недостига табелата за коментари. Пушти SQL migration за issue_comments.",
        );
        setCommentsUnavailable(true);
      } else {
        toast.error(error.message);
      }
      setSavingComment(false);
      return;
    }

    setCommentText("");
    await loadComments();
    setSavingComment(false);
    toast.success("Коментарот е објавен");
  }

  const commentsSection = (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <MessageCircle size={13} className="text-zinc-500" />
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Коментари
        </p>
      </div>

      {commentsUnavailable && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
          Коментари не се достапни додека не се пушти SQL migration за
          `issue_comments`.
        </p>
      )}

      {userId ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="Напиши краток коментар..."
            className="w-full resize-none rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-700 outline-none transition-colors focus:border-teal-400"
          />
          <button
            onClick={submitComment}
            disabled={savingComment || commentText.trim().length === 0}
            className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
            {savingComment ? "Се зачувува..." : "Објави коментар"}
          </button>
        </div>
      ) : (
        <button
          onClick={redirectToAuth}
          className="mb-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-teal-300 hover:text-teal-700">
          Најавете се за да додадете коментар
        </button>
      )}

      <div className="space-y-2">
        {loadingComments && (
          <p className="text-xs text-zinc-400">Се вчитуваат коментари...</p>
        )}
        {!loadingComments && comments.length === 0 && (
          <p className="text-xs italic text-zinc-400">
            Сe уште нема коментари.
          </p>
        )}
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <div className="mb-1 flex items-center gap-2">
              <AvatarInitials
                name={
                  comment.profiles?.full_name ??
                  comment.profiles?.username ??
                  "Анонимно"
                }
                avatarUrl={comment.profiles?.avatar_url ?? null}
                size="sm"
              />
              <p className="text-xs font-semibold text-zinc-700">
                {comment.profiles?.full_name ??
                  comment.profiles?.username ??
                  "Анонимно"}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-zinc-600">
              {comment.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const shareSection = (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
      <button
        onClick={() => setShareOpen((prev) => !prev)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-teal-300 hover:text-teal-700 cursor-pointer">
        <Share2 size={13} /> Сподели
      </button>

      {shareOpen && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={shareFacebook}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#8b9dc3]">
            Facebook
          </button>
          <button
            onClick={shareInstagram}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#d62976]">
            Instagram
          </button>
          <button
            onClick={shareViber}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#7360f2]">
            Viber
          </button>
          <button
            onClick={shareWhatsApp}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#25d366]">
            WhatsApp
          </button>
          <button
            onClick={copyLink}
            className="col-span-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300">
            Копирај линк
          </button>
        </div>
      )}
    </div>
  );

  const helpPlanningSection = (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Помош И Датуми
        </p>
      </div>

      {offersUnavailable && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
          Недостига migration за help planning табли. Пушти SQL за
          `issue_help_offers`.
        </p>
      )}

      {loadingOffers && (
        <p className="text-xs text-zinc-400">Се вчитуваат понуди за помош...</p>
      )}

      {!loadingOffers && helpOffers.length === 0 && (
        <p className="text-xs italic text-zinc-400">
          Сe уште нема понуди за помош.
        </p>
      )}

      <div className="space-y-2">
        {helpOffers.map((offer, index) => (
          <div
            key={offer.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AvatarInitials
                  name={
                    offer.profiles?.full_name ??
                    offer.profiles?.username ??
                    "Анонимно"
                  }
                  avatarUrl={offer.profiles?.avatar_url ?? null}
                  size="sm"
                />
                <div>
                  <p className="text-xs font-semibold text-zinc-700">
                    {offer.profiles?.full_name ??
                      offer.profiles?.username ??
                      "Анонимно"}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {index === 0 ? "Прв помошник" : "Помошник"}
                  </p>
                </div>
              </div>

              {offer.service_date ? (
                <button
                  onClick={() => toggleOfferVote(offer)}
                  disabled={votingForOffer === offer.id}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors",
                    offer.voted_by_me
                      ? "border-teal-300 bg-teal-50 text-teal-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-teal-300",
                  )}>
                  👍 {offer.vote_count}
                </button>
              ) : (
                <span className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500">
                  Без датум
                </span>
              )}
            </div>

            {offer.service_date && (
              <p className="mb-1 text-xs font-medium text-teal-700">
                Предложен датум:{" "}
                {new Date(offer.service_date).toLocaleDateString("mk-MK")}
              </p>
            )}

            {offer.note && (
              <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
                {offer.note}
              </p>
            )}

            <div className="space-y-1.5 border-t border-zinc-200 pt-1.5">
              {offer.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-md bg-white px-2 py-1.5">
                  <p className="text-[11px] font-semibold text-zinc-700">
                    {comment.profiles?.full_name ??
                      comment.profiles?.username ??
                      "Анонимно"}
                  </p>
                  <p className="text-xs text-zinc-600">{comment.body}</p>
                </div>
              ))}

              {userId ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={offerCommentDrafts[offer.id] ?? ""}
                    onChange={(e) =>
                      setOfferCommentDrafts((prev) => ({
                        ...prev,
                        [offer.id]: e.target.value,
                      }))
                    }
                    placeholder="Коментар за оваа понуда..."
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-teal-400"
                  />
                  <button
                    onClick={() => submitOfferComment(offer.id)}
                    disabled={
                      savingOfferCommentFor === offer.id ||
                      !(offerCommentDrafts[offer.id] ?? "").trim()
                    }
                    className="rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                    {savingOfferCommentFor === offer.id ? "..." : "Прати"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={redirectToAuth}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 hover:border-teal-300 hover:text-teal-700">
                  Најавете се за да коментирате како ќе помогнете
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (variant === "engagement") {
    return (
      <div className="space-y-3 p-3">
        {isOwner && (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditing((prev) => !prev);
                  setEditTitle(currentIssue.title);
                  setEditDescription(currentIssue.description ?? "");
                  setEditStreet(currentIssue.street_name ?? "");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                <Pencil size={12} /> {isEditing ? "Откажи" : "Измени"}
              </button>
              <button
                onClick={deleteIssue}
                disabled={deletingIssue}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                <Trash2 size={12} /> {deletingIssue ? "Се брише..." : "Избриши"}
              </button>
            </div>

            {isEditing && (
              <div className="space-y-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700 outline-none focus:border-teal-400"
                  placeholder="Наслов"
                />
                <input
                  value={editStreet}
                  onChange={(e) => setEditStreet(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-700 outline-none focus:border-teal-400"
                  placeholder="Улица (опционално)"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-700 outline-none focus:border-teal-400"
                  placeholder="Опис"
                />
                <button
                  onClick={saveIssueEdits}
                  disabled={savingIssue}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60">
                  {savingIssue ? "Се зачувува..." : "Зачувај промени"}
                </button>
              </div>
            )}
          </div>
        )}

        {helpPlanningSection}
        {shareSection}
        {commentsSection}
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                districtColor(currentIssue.district),
              )}>
              {DISTRICT_LABELS[currentIssue.district] ?? currentIssue.district}
            </span>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md">
              {categoryIcon(currentIssue.category)}{" "}
              {CATEGORY_LABELS[currentIssue.category] ?? currentIssue.category}
            </span>
            <StatusPill status={currentIssue.status} />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 shrink-0 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="space-y-2">
          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditing((prev) => !prev);
                  setEditTitle(currentIssue.title);
                  setEditDescription(currentIssue.description ?? "");
                  setEditStreet(currentIssue.street_name ?? "");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                <Pencil size={12} /> {isEditing ? "Откажи" : "Измени"}
              </button>
              <button
                onClick={deleteIssue}
                disabled={deletingIssue}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                <Trash2 size={12} /> {deletingIssue ? "Се брише..." : "Избриши"}
              </button>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700 outline-none focus:border-teal-400"
                placeholder="Наслов"
              />
              <input
                value={editStreet}
                onChange={(e) => setEditStreet(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-700 outline-none focus:border-teal-400"
                placeholder="Улица (опционално)"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-700 outline-none focus:border-teal-400"
                placeholder="Опис"
              />
              <button
                onClick={saveIssueEdits}
                disabled={savingIssue}
                className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60">
                {savingIssue ? "Се зачувува..." : "Зачувај промени"}
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold leading-snug">
                {currentIssue.title}
              </h2>
              {currentIssue.street_name && (
                <p className="flex items-center gap-1 text-xs text-teal-600 font-medium mt-1">
                  <MapPin size={11} /> {currentIssue.street_name}
                </p>
              )}
              {currentIssue.description && (
                <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                  {currentIssue.description}
                </p>
              )}
            </div>
          )}
        </div>

        {currentIssue.photo_url && (
          <Image
            src={currentIssue.photo_url}
            alt="Фотографија"
            width={1200}
            height={720}
            loading={variant === "full" ? "eager" : "lazy"}
            priority={variant === "full"}
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="w-full rounded-lg object-cover max-h-48 border border-zinc-200"
          />
        )}

        <div className="flex items-center gap-2">
          {currentIssue.profiles && (
            <AvatarInitials
              name={currentIssue.profiles.full_name}
              avatarUrl={currentIssue.profiles.avatar_url}
              size="sm"
            />
          )}
          <div className="text-xs text-zinc-500">
            <span>{currentIssue.profiles?.full_name ?? "Анонимно"}</span>
            <span className="mx-1">·</span>
            <span>{formatDays(currentIssue.created_at)}</span>
          </div>
        </div>

        <div className="space-y-3 border-t border-zinc-100 pt-3">
          {helpPlanningSection}
          {shareSection}
          {commentsSection}
        </div>
      </div>
    </>
  );
}
