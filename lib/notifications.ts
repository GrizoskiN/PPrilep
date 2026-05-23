export type NotificationType =
  | "issue_comment"
  | "issue_affected"
  | "issue_helper"
  | "issue_help_comment"
  | "issue_help_vote"
  | "idea_upvote"
  | "comment_like"
  | "comment_reply";

interface NotificationErrorLike {
  code?: string | null;
  message?: string | null;
}

interface CreateNotificationInput {
  recipientUserId?: string | null;
  actorUserId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
}

export function isMissingNotificationsTableError(
  error?: NotificationErrorLike | null,
) {
  if (!error) return false;

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes(
      "Could not find the table 'public.notifications' in the schema cache",
    ) === true
  );
}

export async function createNotification(
  supabase: {
    from: (table: string) => {
      insert: (value: Record<string, unknown>) => {
        select?: unknown;
        then: PromiseLike<unknown>["then"];
      };
    };
  },
  input: CreateNotificationInput,
) {
  if (!input.recipientUserId || !input.actorUserId) return;
  if (input.recipientUserId === input.actorUserId) return;

  const { error } = (await supabase.from("notifications").insert({
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  })) as { error?: { code?: string; message?: string } | null };

  if (!error || isMissingNotificationsTableError(error)) return;
  if (process.env.NODE_ENV !== "production") {
    console.error("[notifications] create error:", error.message);
  }
}
