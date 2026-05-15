"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BlurImage from "../ui/BlurImage";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Share2,
  MapPin,
  MessageCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  HandHelping,
} from "lucide-react";
import StatusPill from "../ui/StatusPill";
import AvatarInitials from "../ui/AvatarInitials";
import ImageLightbox from "../ui/ImageLightbox";
import {
  formatDays,
  districtColor,
  categoryIcon,
  cn,
  DISTRICT_LABELS,
  CATEGORY_LABELS,
  getIssuePath,
  cdnUrl,
} from "../../lib/utils";
import type { Issue, IssueStatus } from "../../lib/types/database";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../../lib/hooks/useAuth";

interface Props {
  issue: Issue;
  userId?: string;
  onClose?: () => void;
  variant?: "full" | "engagement";
  hideImage?: boolean;
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

type PeopleUser = {
  user_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

function PeoplePopup({
  title,
  icon,
  users,
  accentColor,
  onClose,
}: {
  title: string;
  icon: React.ReactNode;
  users: PeopleUser[];
  accentColor: "slate" | "teal";
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[60vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {icon}
            {title}
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                accentColor === "teal"
                  ? "bg-teal-50 text-teal-700"
                  : "bg-slate-100 text-slate-700"
              }`}>
              {users.length}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-zinc-50 px-4 py-2">
          {users.map((u) => {
            const name =
              u.profiles?.full_name ?? u.profiles?.username ?? "Анонимно";
            const href = u.profiles?.username
              ? `/u/${u.profiles.username}`
              : `/u/${u.user_id}`;
            return (
              <Link
                key={u.user_id}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-zinc-50 -mx-4 px-4 transition-colors">
                <AvatarInitials
                  name={name}
                  avatarUrl={u.profiles?.avatar_url ?? null}
                  size="sm"
                />
                <span className="text-sm text-zinc-800">{name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ChangeRequest = {
  id: number;
  issue_id: number;
  requester_user_id: string;
  type: "status_change";
  payload: {
    status: "progress" | "resolved";
    description: string;
    after_photo_url?: string | null;
  };
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

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
  hideImage = false,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  function redirectToAuth() {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
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
  const [affectedUsers, setAffectedUsers] = useState<PeopleUser[]>([]);
  const [helperUsers, setHelperUsers] = useState<PeopleUser[]>([]);
  const [showAffectedPopup, setShowAffectedPopup] = useState(false);
  const [showHelperPopup, setShowHelperPopup] = useState(false);
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
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const approvingInFlight = useRef(false);
  // proposal modal
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeStatus, setProposeStatus] = useState<
    "progress" | "resolved" | null
  >(null);
  const [proposeDesc, setProposeDesc] = useState("");
  const [proposeFile, setProposeFile] = useState<File | null>(null);
  const [proposePreview, setProposePreview] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  // direct helper check (for full-page where is_helper may not be pre-loaded)
  const [isHelperDirect, setIsHelperDirect] = useState(
    Boolean(currentIssue.is_helper),
  );
  // resolver info & upvote state
  const [resolver, setResolver] = useState<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [resolverUpvotes, setResolverUpvotes] = useState<number>(0);
  const [hasUpvotedResolver, setHasUpvotedResolver] = useState(false);
  const [upvotingResolver, setUpvotingResolver] = useState(false);

  const { profile: authProfile } = useAuth();
  const isAdmin = Boolean(authProfile?.is_admin);
  const isOwner = Boolean(userId && currentIssue.reported_by === userId);
  const canModerate = isOwner || isAdmin;

  // Ensure isHelperDirect is set for any authenticated user who has already
  // registered as a helper. Skip if the server-side prefetch (page.tsx) already
  // told us — only fire when is_helper is undefined on the input issue.
  useEffect(() => {
    if (!userId || isHelperDirect) return;
    if (typeof currentIssue.is_helper === "boolean") return; // server already resolved
    supabase
      .from("issue_helpers")
      .select("user_id")
      .eq("issue_id", currentIssue.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsHelperDirect(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIssue.id, userId]);

  useEffect(() => {
    // Sync external `issue` prop into local state. Defer to next tick so the
    // setState calls don't run synchronously during commit.
    const id = setTimeout(() => {
      setCurrentIssue(issue);
      setEditTitle(issue.title);
      setEditDescription(issue.description ?? "");
      setEditStreet(issue.street_name ?? "");
      setIsEditing(false);
    }, 0);
    return () => clearTimeout(id);
  }, [issue]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${location.origin}${getIssuePath(currentIssue.id, currentIssue.title)}`
      : "";

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

  async function loadPeopleStats() {
    const [{ data: affected }, { data: helpers }] = await Promise.all([
      supabase
        .from("issue_affected")
        .select("user_id, profiles:user_id(full_name, avatar_url, username)")
        .eq("issue_id", currentIssue.id),
      supabase
        .from("issue_helpers")
        .select("user_id, profiles:user_id(full_name, avatar_url, username)")
        .eq("issue_id", currentIssue.id),
    ]);
    setAffectedUsers(
      (affected ?? []).map((r) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      })),
    );
    setHelperUsers(
      (helpers ?? []).map((r) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      })),
    );
  }

  useEffect(() => {
    const id = setTimeout(() => loadPeopleStats(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIssue.id]);

  async function loadChangeRequests() {
    // Use a SECURITY DEFINER RPC so the issue owner can always read pending
    // requests on their issue, regardless of RLS on issue_change_requests.
    const { data, error } = await supabase.rpc("get_pending_change_requests", {
      p_issue_id: currentIssue.id,
    });
    if (error) {
      console.error(
        "loadChangeRequests error:",
        error.message,
        error.details,
        error.hint,
        error.code,
        JSON.stringify(error),
      );
      return;
    }
    setPendingRequests((data ?? []) as ChangeRequest[]);
  }

  useEffect(() => {
    if (!canModerate) return;
    const id = setTimeout(() => loadChangeRequests(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIssue.id, canModerate]);

  async function loadResolverInfo() {
    // Single RPC bundles: resolver profile, upvote count, and whether *I* upvoted.
    const { data, error } = await supabase.rpc("get_resolver_info", {
      p_issue_id: currentIssue.id,
    });
    if (error || !data) {
      setResolver(null);
      setResolverUpvotes(0);
      setHasUpvotedResolver(false);
      return;
    }
    // RPC returns a row: { resolver: jsonb|null, upvote_count: int, has_upvoted: bool }
    const row = Array.isArray(data) ? data[0] : data;
    setResolver(row?.resolver ?? null);
    setResolverUpvotes(row?.upvote_count ?? 0);
    setHasUpvotedResolver(Boolean(row?.has_upvoted));
  }

  useEffect(() => {
    // Defer to next tick so async setState resolves don't fire synchronously
    // during the render commit phase.
    const id = setTimeout(() => {
      if (currentIssue.status === "resolved") {
        loadResolverInfo();
      } else {
        setResolver(null);
        setResolverUpvotes(0);
        setHasUpvotedResolver(false);
      }
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIssue.id, currentIssue.status, currentIssue.resolved_by, userId]);

  const [savingResolver, setSavingResolver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  async function setResolverFor(newResolverId: string | null) {
    if (!canModerate || !userId || savingResolver) return;
    setSavingResolver(true);
    let q = supabase
      .from("issues")
      .update({ resolved_by: newResolverId })
      .eq("id", currentIssue.id);
    if (!isAdmin) q = q.eq("reported_by", userId);
    const { error } = await q;
    if (error) {
      toast.error(error.message);
      setSavingResolver(false);
      return;
    }
    setCurrentIssue((prev) => ({ ...prev, resolved_by: newResolverId }));
    await loadResolverInfo();
    toast.success("Решавачот е променет");
    setSavingResolver(false);
  }

  async function toggleResolverUpvote() {
    if (!userId) {
      redirectToAuth();
      return;
    }
    if (!resolver || upvotingResolver) return;
    if (resolver.id === userId) {
      toast.error("Не можеш да гласаш за себе");
      return;
    }
    setUpvotingResolver(true);
    if (hasUpvotedResolver) {
      const { error } = await supabase
        .from("issue_resolution_upvotes")
        .delete()
        .eq("issue_id", currentIssue.id)
        .eq("user_id", userId);
      if (error) {
        toast.error(error.message);
        setUpvotingResolver(false);
        return;
      }
      setHasUpvotedResolver(false);
      setResolverUpvotes((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase
        .from("issue_resolution_upvotes")
        .insert({ issue_id: currentIssue.id, user_id: userId });
      if (error) {
        toast.error(error.message);
        setUpvotingResolver(false);
        return;
      }
      setHasUpvotedResolver(true);
      setResolverUpvotes((c) => c + 1);
      toast.success("Благодарност испратена!");
    }
    setUpvotingResolver(false);
  }

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

  const [changingStatus, setChangingStatus] = useState(false);

  async function changeStatus(newStatus: "open" | "progress" | "resolved") {
    if (!canModerate || !userId || changingStatus) return;
    if (newStatus === currentIssue.status) return;
    setChangingStatus(true);
    const update: Record<string, unknown> = { status: newStatus };
    // Going to resolved: do NOT auto-assign — owner picks the resolver via the
    // dropdown. Going to open/progress: clear any previous resolver.
    if (newStatus !== "resolved") update.resolved_by = null;
    let q = supabase.from("issues").update(update).eq("id", currentIssue.id);
    if (!isAdmin) q = q.eq("reported_by", userId);
    const { error } = await q;
    if (error) toast.error(error.message);
    else {
      setCurrentIssue((prev) => ({
        ...prev,
        status: newStatus,
        resolved_by: newStatus === "resolved" ? userId : null,
      }));
      toast.success("Статусот е променет");
      // Refetch resolver display info
      if (newStatus === "resolved") loadResolverInfo();
    }
    setChangingStatus(false);
  }

  async function uploadAfterPhoto(file: File) {
    if (!canModerate || !userId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Избери слика (jpg/png/webp)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Сликата е преголема (макс 8MB)");
      return;
    }
    setUploadingAfter(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const { data, error } = await supabase.storage
      .from("issue-photos")
      .upload(`${currentIssue.id}/after-${Date.now()}.${ext}`, file, {
        contentType: file.type,
        upsert: true,
      });
    if (error) {
      toast.error(error.message);
      setUploadingAfter(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("issue-photos").getPublicUrl(data.path);
    const { error: upd } = await supabase
      .from("issues")
      .update({ after_photo_url: publicUrl })
      .eq("id", currentIssue.id);
    if (upd) {
      toast.error(upd.message);
      setUploadingAfter(false);
      return;
    }
    setCurrentIssue((prev) => ({ ...prev, after_photo_url: publicUrl }));
    toast.success("Фотографијата е прикачена");
    setUploadingAfter(false);
  }

  async function submitProposal() {
    if (!userId || !proposeStatus || !proposeDesc.trim() || proposing) return;
    setProposing(true);
    let afterPhotoUrl: string | null = null;
    if (proposeFile) {
      const ext = proposeFile.name.split(".").pop() ?? "jpg";
      const { data, error } = await supabase.storage
        .from("issue-photos")
        .upload(
          `${userId}/proposals/${currentIssue.id}-${Date.now()}.${ext}`,
          proposeFile,
          { contentType: proposeFile.type, upsert: true },
        );
      if (error) {
        toast.error(error.message);
        setProposing(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("issue-photos").getPublicUrl(data.path);
      afterPhotoUrl = publicUrl;
    }
    const { error } = await supabase.rpc("submit_change_request", {
      p_issue_id: currentIssue.id,
      p_payload: {
        status: proposeStatus,
        description: proposeDesc.trim(),
        after_photo_url: afterPhotoUrl,
      },
    });
    if (error) {
      toast.error(error.message);
      setProposing(false);
      return;
    }
    toast.success("Барањето е испратено до авторот за одобрување");
    setShowProposeModal(false);
    setProposeStatus(null);
    setProposeDesc("");
    setProposeFile(null);
    setProposePreview(null);
    setProposing(false);
  }

  async function saveIssueEdits() {
    if (!canModerate || !userId) return;

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

    let q = supabase.from("issues").update(payload).eq("id", currentIssue.id);
    if (!isAdmin) q = q.eq("reported_by", userId);
    const { data, error } = await q
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
    if (!canModerate || !userId || deletingIssue) return;

    const ok = window.confirm(
      "Дали сигурно сакаш да ја избришеш оваа пријава?",
    );
    if (!ok) return;

    setDeletingIssue(true);

    let q = supabase.from("issues").delete().eq("id", currentIssue.id);
    if (!isAdmin) q = q.eq("reported_by", userId);
    const { error } = await q;

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

  const PEOPLE_PREVIEW = 5;

  function UserChip({
    u,
    accentColor,
  }: {
    u: {
      user_id: string;
      profiles?: {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      } | null;
    };
    accentColor: "slate" | "teal";
  }) {
    const name = u.profiles?.full_name ?? u.profiles?.username ?? "Анонимно";
    const href = u.profiles?.username
      ? `/u/${u.profiles.username}`
      : `/u/${u.user_id}`;

    return (
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 cursor-pointer transition-colors ${
          accentColor === "teal"
            ? "bg-teal-50 border-teal-100 hover:border-teal-300"
            : "bg-zinc-50 border-zinc-100 hover:border-zinc-300"
        }`}>
        <AvatarInitials
          name={name}
          avatarUrl={u.profiles?.avatar_url ?? null}
          size="sm"
        />
        <span
          className={`text-xs ${accentColor === "teal" ? "text-teal-700" : "text-zinc-700"}`}>
          {name}
        </span>
      </Link>
    );
  }

  const peopleSection = (affectedUsers.length > 0 ||
    helperUsers.length > 0) && (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-3">
      {affectedUsers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Засегнати ({affectedUsers.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {affectedUsers.slice(0, PEOPLE_PREVIEW).map((u) => (
              <UserChip key={u.user_id} u={u} accentColor="slate" />
            ))}
            {affectedUsers.length > PEOPLE_PREVIEW && (
              <button
                onClick={() => setShowAffectedPopup(true)}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 transition-colors">
                +{affectedUsers.length - PEOPLE_PREVIEW} повеќе
              </button>
            )}
          </div>
        </div>
      )}

      {helperUsers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <HandHelping size={12} className="text-teal-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Сакаат да помогнат ({helperUsers.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {helperUsers.slice(0, PEOPLE_PREVIEW).map((u) => (
              <UserChip key={u.user_id} u={u} accentColor="teal" />
            ))}
            {helperUsers.length > PEOPLE_PREVIEW && (
              <button
                onClick={() => setShowHelperPopup(true)}
                className="flex items-center gap-1 rounded-lg border border-teal-100 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-600 hover:border-teal-300 transition-colors">
                +{helperUsers.length - PEOPLE_PREVIEW} повеќе
              </button>
            )}
          </div>
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

  async function approveRequest(req: ChangeRequest) {
    if (!canModerate || !userId || approvingInFlight.current) return;
    approvingInFlight.current = true;
    setApprovingId(req.id);
    const { error } = await supabase.rpc("approve_change_request", {
      p_id: req.id,
    });
    if (error) {
      toast.error(error.message);
      approvingInFlight.current = false;
      setApprovingId(null);
      return;
    }
    // Award 1 applause to the helper when their "resolved" proposal is accepted
    if (req.payload.status === "resolved") {
      await supabase.rpc("award_applause", { p_user_id: req.requester_user_id });
    }
    setCurrentIssue((prev) => ({
      ...prev,
      status: req.payload.status as IssueStatus,
      ...(req.payload.after_photo_url
        ? { after_photo_url: req.payload.after_photo_url }
        : {}),
    }));
    toast.success("Одобрено — статусот е променет");
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
    approvingInFlight.current = false;
    setApprovingId(null);
  }

  async function rejectRequest(req: ChangeRequest) {
    if (!canModerate || approvingId) return;
    setApprovingId(req.id);
    const { error } = await supabase.rpc("reject_change_request", {
      p_id: req.id,
    });
    if (error) {
      toast.error(error.message);
      setApprovingId(null);
      return;
    }
    toast.success("Одбиено");
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
    setApprovingId(null);
  }

  const STATUS_LABEL: Record<string, string> = {
    progress: "Во тек",
    resolved: "Завршено",
  };

  const pendingRequestsSection = canModerate && pendingRequests.length > 0 && (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
        🔔 Барања за одобрување ({pendingRequests.length})
      </p>
      {pendingRequests.map((req) => {
        const name =
          req.profiles?.full_name ?? req.profiles?.username ?? "Помошник";
        return (
          <div
            key={req.id}
            className="rounded-lg bg-white border border-amber-100 p-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <AvatarInitials
                name={name}
                avatarUrl={req.profiles?.avatar_url ?? null}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800">{name}</p>
                <p className="text-xs text-zinc-500">
                  Предлага статус:{" "}
                  <span className="font-semibold text-teal-700">
                    {STATUS_LABEL[req.payload.status] ?? req.payload.status}
                  </span>
                </p>
                <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                  {req.payload.description}
                </p>
                {req.payload.after_photo_url && (
                  <Image
                    src={cdnUrl(req.payload.after_photo_url)}
                    alt="Потоа"
                    width={640}
                    height={360}
                    sizes="(max-width: 640px) 100vw, 360px"
                    className="mt-1.5 w-full max-h-36 object-cover rounded-lg border border-zinc-200"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approveRequest(req)}
                disabled={approvingId === req.id}
                className="flex-1 rounded-lg bg-teal-600 text-white text-xs font-semibold py-1.5 hover:bg-teal-700 disabled:opacity-60 transition-colors">
                ✓ Одобри
              </button>
              <button
                onClick={() => rejectRequest(req)}
                disabled={approvingId === req.id}
                className="flex-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold py-1.5 hover:bg-red-50 disabled:opacity-60 transition-colors">
                ✕ Одбиј
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const resolverSection = currentIssue.status === "resolved" && resolver && (
    <div className="rounded-xl border border-teal-200 bg-linear-to-br from-teal-50 to-emerald-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🏆</span>
          <Link
            href={resolver.username ? `/u/${resolver.username}` : `/u/${resolver.id}`}
            className="flex items-center gap-2 min-w-0 group">
            <AvatarInitials
              name={resolver.full_name ?? resolver.username ?? "Херој"}
              avatarUrl={resolver.avatar_url}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-teal-800 leading-tight">Решено од</p>
              <p className="text-sm font-bold text-zinc-900 group-hover:underline truncate">
                {resolver.full_name ?? resolver.username ?? "Херој"}
              </p>
            </div>
          </Link>
        </div>
        <button
          onClick={toggleResolverUpvote}
          disabled={upvotingResolver || resolver.id === userId}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95",
            hasUpvotedResolver
              ? "bg-teal-600 text-white"
              : "bg-white border border-teal-300 text-teal-700 hover:bg-teal-50",
            resolver.id === userId && "opacity-50 cursor-not-allowed",
          )}
          title={resolver.id === userId ? "Не можеш да гласаш за себе" : "Дај поени на херојот"}>
          <span className="text-sm">👏</span>
          <span>{resolverUpvotes}</span>
        </button>
      </div>
    </div>
  );

  const helperProposalButton = userId && !isOwner && !isAdmin && (
    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
      <button
        onClick={() => setShowProposeModal(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b9f95] hover:bg-[#338c84] text-white text-xs font-semibold py-2.5 transition-colors">
        <HandHelping size={13} /> Предложи промена на статус
      </button>
    </div>
  );

  const proposeModal = showProposeModal && (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(4px)",
      }}
      onClick={() => {
        if (!proposing) {
          setShowProposeModal(false);
        }
      }}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HandHelping size={14} className="text-teal-600" />
            Предложи промена на статус
          </h3>
          <button
            onClick={() => setShowProposeModal(false)}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Status choice */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 mb-1.5">
              Нов статус *
            </p>
            <div className="flex gap-2">
              {(["progress", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setProposeStatus(s)}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors",
                    proposeStatus === s
                      ? s === "resolved"
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "bg-amber-500 border-amber-500 text-white"
                      : s === "resolved"
                        ? "border-teal-200 text-teal-700 hover:bg-teal-50"
                        : "border-amber-200 text-amber-700 hover:bg-amber-50",
                  )}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 mb-1.5">
              Опис / Порака *
            </p>
            <textarea
              value={proposeDesc}
              onChange={(e) => setProposeDesc(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Опиши ги извршените работи, кој поправил, кога..."
              className="w-full resize-none rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-700 outline-none focus:border-teal-400"
            />
          </div>
          {/* Photo */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 mb-1.5">
              Фотографија после (опционално)
            </p>
            {proposePreview ? (
              <div className="relative">
                {/* Local blob URL from URL.createObjectURL — next/image can't optimize it */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proposePreview}
                  alt="preview"
                  className="w-full max-h-36 object-cover rounded-lg border border-zinc-200"
                />
                <button
                  onClick={() => {
                    setProposeFile(null);
                    setProposePreview(null);
                  }}
                  className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2.5 text-xs font-semibold text-zinc-500 hover:border-teal-400 hover:text-teal-600 transition-colors">
                + Додади слика
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setProposeFile(f);
                      setProposePreview(URL.createObjectURL(f));
                    }
                  }}
                />
              </label>
            )}
          </div>
          <button
            onClick={submitProposal}
            disabled={!proposeStatus || !proposeDesc.trim() || proposing}
            className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition-colors">
            {proposing ? "Се испраќа..." : "Испрати барање"}
          </button>
        </div>
      </div>
    </div>
  );

  const statusOptions: {
    value: "open" | "progress" | "resolved";
    label: string;
    classes: string;
  }[] = [
    {
      value: "open",
      label: "Отворено",
      classes: "border-zinc-200 text-zinc-600 hover:border-zinc-400",
    },
    {
      value: "progress",
      label: "Во тек",
      classes: "border-amber-200 text-amber-700 hover:border-amber-400",
    },
    {
      value: "resolved",
      label: "Завршено",
      classes: "border-teal-200 text-teal-700 hover:border-teal-400",
    },
  ];

  const statusSelector = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mr-0.5">
          Статус:
        </span>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => changeStatus(opt.value)}
            disabled={changingStatus}
            className={cn(
              "px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-60",
              currentIssue.status === opt.value
                ? "bg-zinc-900 border-zinc-900 text-white"
                : `bg-white ${opt.classes}`,
            )}>
            {opt.label}
          </button>
        ))}
      </div>
      {/* Resolver picker — only when status is resolved */}
      {currentIssue.status === "resolved" && (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pt-1.5">
            Решено од:
          </span>
          <select
            value={currentIssue.resolved_by ?? ""}
            disabled={savingResolver}
            onChange={(e) => setResolverFor(e.target.value || null)}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 outline-none focus:border-teal-400 disabled:opacity-60">
            <option value="">— Никој / Непознато —</option>
            {currentIssue.reported_by && (
              <option value={currentIssue.reported_by}>
                {currentIssue.profiles?.full_name ??
                  currentIssue.profiles?.username ??
                  "Авторот"}{" "}
                (автор)
              </option>
            )}
            {helperUsers
              .filter((h) => h.user_id !== currentIssue.reported_by)
              .map((h) => (
                <option key={h.user_id} value={h.user_id}>
                  {h.profiles?.full_name ?? h.profiles?.username ?? "Помошник"}
                </option>
              ))}
            {/* If current resolved_by isn't in the list, keep it visible */}
            {currentIssue.resolved_by &&
              currentIssue.resolved_by !== currentIssue.reported_by &&
              !helperUsers.some(
                (h) => h.user_id === currentIssue.resolved_by,
              ) &&
              resolver && (
                <option value={currentIssue.resolved_by}>
                  {resolver.full_name ?? resolver.username ?? "Решавач"}
                </option>
              )}
          </select>
        </div>
      )}
      {/* After photo upload */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
          Фото Потоа:
        </span>
        {currentIssue.after_photo_url ? (
          <span className="text-[11px] text-teal-600 font-medium">
            ✓ Прикачено
          </span>
        ) : null}
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-teal-400 hover:text-teal-700 transition-colors">
          {uploadingAfter
            ? "Се прикачува..."
            : currentIssue.after_photo_url
              ? "Замени"
              : "+ Додади слика"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingAfter}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAfterPhoto(f);
            }}
          />
        </label>
      </div>
    </div>
  );

  if (variant === "engagement") {
    return (
      <div className="space-y-3 p-3">
        {canModerate && (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
            {isAdmin && !isOwner && (
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                ⚠ Модератор
              </p>
            )}
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
            {statusSelector}
            {pendingRequestsSection}

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

        {resolverSection}
        {helperProposalButton}
        {commentsSection}

        {showAffectedPopup && (
          <PeoplePopup
            title="Засегнати"
            icon={<AlertTriangle size={14} className="text-slate-600" />}
            users={affectedUsers}
            accentColor="slate"
            onClose={() => setShowAffectedPopup(false)}
          />
        )}
        {showHelperPopup && (
          <PeoplePopup
            title="Сакаат да помогнат"
            icon={<HandHelping size={14} className="text-teal-600" />}
            users={helperUsers}
            accentColor="teal"
            onClose={() => setShowHelperPopup(false)}
          />
        )}
        {proposeModal}
        {lightboxSrc && (
          <ImageLightbox
            src={lightboxSrc}
            alt={currentIssue.title}
            beforeSrc={currentIssue.photo_url}
            afterSrc={currentIssue.after_photo_url}
            onClose={() => setLightboxSrc(null)}
          />
        )}
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
          {canModerate && (
            <>
              {isAdmin && !isOwner && (
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  ⚠ Модератор
                </p>
              )}
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
                  <Trash2 size={12} />{" "}
                  {deletingIssue ? "Се брише..." : "Избриши"}
                </button>
              </div>
              {statusSelector}
              {pendingRequestsSection}
            </>
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

        {/* Before / after photos */}
        {!hideImage && (currentIssue.photo_url || currentIssue.after_photo_url) &&
          (currentIssue.photo_url && currentIssue.after_photo_url ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                  Пред
                </p>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(currentIssue.photo_url!)}
                  className="block w-full cursor-zoom-in p-0">
                  <BlurImage
                    src={currentIssue.photo_url}
                    alt="Пред"
                    width={1200}
                    height={900}
                    sizes="(max-width: 1024px) 50vw, 360px"
                    rounded="rounded-lg"
                    wrapperClassName="border border-zinc-200"
                    className="w-full object-cover h-80"
                  />
                </button>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wide mb-1">
                  Потоа
                </p>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(currentIssue.after_photo_url!)}
                  className="block w-full cursor-zoom-in p-0">
                  <BlurImage
                    src={currentIssue.after_photo_url}
                    alt="Потоа"
                    width={1200}
                    height={900}
                    sizes="(max-width: 1024px) 50vw, 360px"
                    rounded="rounded-lg"
                    wrapperClassName="border border-teal-200"
                    className="w-full object-cover h-80"
                  />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                setLightboxSrc(
                  (currentIssue.photo_url ?? currentIssue.after_photo_url)!,
                )
              }
              className="block w-full cursor-zoom-in p-0">
              <BlurImage
                src={(currentIssue.photo_url ?? currentIssue.after_photo_url)!}
                alt="Фотографија"
                width={1600}
                height={1200}
                loading={variant === "full" ? "eager" : "lazy"}
                priority={variant === "full"}
                sizes="(max-width: 1024px) 100vw, 800px"
                rounded="rounded-lg"
                wrapperClassName="border border-zinc-200"
                className="w-full object-cover h-96 md:h-112"
              />
            </button>
          ))}

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
          {resolverSection}
          {helperProposalButton}
          {commentsSection}
        </div>
      </div>

      {showAffectedPopup && (
        <PeoplePopup
          title="Засегнати"
          icon={<AlertTriangle size={14} className="text-slate-600" />}
          users={affectedUsers}
          accentColor="slate"
          onClose={() => setShowAffectedPopup(false)}
        />
      )}
      {showHelperPopup && (
        <PeoplePopup
          title="Сакаат да помогнат"
          icon={<HandHelping size={14} className="text-teal-600" />}
          users={helperUsers}
          accentColor="teal"
          onClose={() => setShowHelperPopup(false)}
        />
      )}
      {proposeModal}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={currentIssue.title}
          beforeSrc={currentIssue.photo_url}
          afterSrc={currentIssue.after_photo_url}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
}
