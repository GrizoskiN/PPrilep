"use client";

import { useMemo, useState } from "react";
import { ThumbsUp } from "lucide-react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { createNotification } from "../../lib/notifications";
import { formatDays, cn } from "../../lib/utils";
import AvatarInitials from "../ui/AvatarInitials";
import type { Idea } from "../../lib/types/database";
import { toast } from "sonner";

interface Props {
  idea: Idea;
  userId?: string;
}

export default function IdeaCard({ idea, userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [upvotes, setUpvotes] = useState(idea.upvotes);
  const [voted, setVoted] = useState(false);

  function redirectToAuth() {
    const next = `${location.pathname}${location.search}`;
    // Prevent redirect on localhost during development
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
    ) {
      return;
    }
    location.href = `/auth/login?next=${encodeURIComponent(next)}`;
  }

  async function upvote() {
    if (!userId) {
      redirectToAuth();
      return;
    }
    if (voted) return;
    setUpvotes((u) => u + 1);
    setVoted(true);
    const { error } = await supabase
      .from("ideas")
      .update({ upvotes: upvotes + 1 })
      .eq("id", idea.id);
    if (error) {
      setUpvotes((u) => Math.max(0, u - 1));
      setVoted(false);
      toast.error(error.message);
      return;
    }

    await createNotification(supabase, {
      recipientUserId: idea.created_by,
      actorUserId: userId,
      type: "idea_upvote",
      title: idea.title,
      body: "ја лајкна вашата идеја",
      link: `/ideas/${idea.id}`,
    });
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">
            <Link href={`/ideas/${idea.id}`} className="hover:underline">
              {idea.title}
            </Link>
          </h3>
          {idea.body && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-3">
              {idea.body}
            </p>
          )}
        </div>
        <button
          onClick={upvote}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded border text-xs font-semibold transition-colors shrink-0",
            voted
              ? "border-black bg-black text-white"
              : "border-zinc-200 text-zinc-600 hover:border-black",
          )}>
          <ThumbsUp size={12} />
          {upvotes}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {idea.profiles && (
          <AvatarInitials name={idea.profiles.full_name} size="sm" />
        )}
        <span className="text-[11px] text-zinc-400">
          {idea.profiles?.full_name ?? "Анонимно"} ·{" "}
          {formatDays(idea.created_at)}
        </span>
      </div>
    </div>
  );
}
