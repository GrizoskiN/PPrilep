import { createClient } from "@/lib/supabase/server";
import Shell from "@/components/layout/Shell";
import IssueDetail from "@/components/issues/IssueDetail";
import { getIssuePath, parseIssueIdFromSegment } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IssueDetailPage({ params }: Props) {
  const { id } = await params;
  const issueId = parseIssueIdFromSegment(id);
  if (!issueId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select(`*, profiles:reported_by(id, full_name, avatar_url, username)`)
    .eq("id", issueId)
    .maybeSingle();

  if (issueError) {
    console.error("[IssueDetailPage] issue fetch error:", issueError);
    notFound();
  }

  if (!issue) notFound();

  const canonicalPath = getIssuePath(issue.id, issue.title);
  if (`/issues/${id}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const [{ count: affectedCount }, { count: helperCount }] = await Promise.all([
    supabase
      .from("issue_affected")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId),
    supabase
      .from("issue_helpers")
      .select("*", { count: "exact", head: true })
      .eq("issue_id", issueId),
  ]);

  const enriched = {
    ...issue,
    affected_count: affectedCount ?? 0,
    helper_count: helperCount ?? 0,
  };

  return (
    <Shell>
      <div className="max-w-xl mx-auto py-6 px-4">
        <IssueDetail issue={enriched} userId={user?.id} />
      </div>
    </Shell>
  );
}
