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

  // Fetch issue + everything else in parallel on the server.
  // This replaces ~5 client-side round-trips with one server round.
  const [
    issueRes,
    affectedCountRes,
    helperCountRes,
    isAffectedRes,
    isHelperRes,
  ] = await Promise.all([
    supabase
      .from("issues")
      .select(`*, profiles:reported_by(id, full_name, avatar_url, username), resolver:resolved_by(id, full_name, avatar_url, username)`)
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
  if (issueError) {
    console.error("[IssueDetailPage] issue fetch error:", issueError);
    notFound();
  }

  if (!issue) notFound();

  const canonicalPath = getIssuePath(issue.id, issue.title);
  if (`/issues/${id}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const enriched = {
    ...issue,
    affected_count: affectedCountRes.count ?? 0,
    helper_count: helperCountRes.count ?? 0,
    is_affected: Boolean(isAffectedRes.data),
    is_helper: Boolean(isHelperRes.data),
    user_helper_note: isHelperRes.data?.note ?? null,
  };

  return (
    <Shell>
      <div className="max-w-xl mx-auto py-6 px-4">
        <IssueDetail issue={enriched} userId={user?.id} />
      </div>
    </Shell>
  );
}
