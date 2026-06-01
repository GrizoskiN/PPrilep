import { createClient } from "@/lib/supabase/server";
import { getIssuePath, parseIssueIdFromSegment } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import IssuePageClient from "./IssuePageClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const issueId = parseIssueIdFromSegment(id);
  if (!issueId) return {};

  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("issues")
    .select("title, description, photo_url")
    .eq("id", issueId)
    .maybeSingle();

  if (!issue) return {};

  return {
    title: `${issue.title} — Подобар Прилеп`,
    description: issue.description ?? undefined,
    openGraph: {
      title: issue.title,
      description: issue.description ?? undefined,
      images: issue.photo_url ? [{ url: issue.photo_url }] : [],
    },
  };
}

export default async function IssueDetailPage({ params }: Props) {
  const { id } = await params;
  const issueId = parseIssueIdFromSegment(id);
  if (!issueId) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    issueRes,
    affectedCountRes,
    helperCountRes,
    isAffectedRes,
    isHelperRes,
  ] = await Promise.all([
    supabase
      .from("issues")
      .select(`*, profiles:reported_by(id, full_name, avatar_url, username, membership_tier, points), resolver:resolved_by(id, full_name, avatar_url, username, membership_tier, points)`)
      .eq("id", issueId)
      .maybeSingle(),
    supabase
      .from("issue_affected")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId),
    supabase
      .from("issue_helpers")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId),
    user
      ? supabase
          .from("issue_affected")
          .select("user_id")
          .eq("issue_id", issueId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
    user
      ? supabase
          .from("issue_helpers")
          .select("user_id, note")
          .eq("issue_id", issueId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
  ]);

  const { data: issue, error: issueError } = issueRes;
  if (issueError || !issue) notFound();

  const canonicalPath = getIssuePath(issue.id, issue.title);
  if (`/issues/${id}` !== canonicalPath) redirect(canonicalPath);

  const enriched = {
    ...issue,
    affected_count: affectedCountRes.count ?? 0,
    helper_count: helperCountRes.count ?? 0,
    is_affected: Boolean(isAffectedRes.data),
    is_helper: Boolean(isHelperRes.data),
    user_helper_note: isHelperRes.data?.note ?? null,
  };

  return <IssuePageClient issue={enriched} userId={user?.id} />;
}
