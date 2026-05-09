import { createClient } from "../../../lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Shell from "../../../components/layout/Shell";
import AvatarInitials from "../../../components/ui/AvatarInitials";
import StatusPill from "../../../components/ui/StatusPill";
import {
  DISTRICT_LABELS,
  STATUS_LABELS,
  formatDays,
  getIssuePath,
  cdnUrl,
} from "../../../lib/utils";

interface Props {
  params: Promise<{ username: string }>;
}

// UUID v4 pattern — used to detect user_id slugs vs plain usernames
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfilePage({ params }: Props) {
  const { username: slug } = await params;
  const supabase = await createClient();

  // Accept either a username or a raw user_id (UUID)
  const isUuid = UUID_RE.test(slug);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq(isUuid ? "id" : "username", slug)
    .single();

  if (!profile) notFound();

  const userId = profile.id;

  // Fetch all three in parallel
  const [issuesRes, helpersRes, affectedRes] = await Promise.all([
    supabase
      .from("issues")
      .select("id, title, district, status, created_at, description")
      .eq("reported_by", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("issue_helpers")
      .select("issue_id, note, issues(id, title, district, status, created_at)")
      .eq("user_id", userId),
    supabase
      .from("issue_affected")
      .select("issue_id, issues(id, title, district, status, created_at)")
      .eq("user_id", userId),
  ]);

  const myIssues = (issuesRes.data ?? []) as Array<{
    id: number;
    title: string;
    district: string;
    status: string;
    created_at: string;
    description: string | null;
  }>;

  type IssueRef = { id: number; title: string; district: string; status: string; created_at: string } | null;

  const helperActivity = (helpersRes.data ?? []) as unknown as Array<{
    issue_id: number;
    note: string | null;
    issues: IssueRef;
  }>;

  const affectedActivity = (affectedRes.data ?? []) as unknown as Array<{
    issue_id: number;
    issues: IssueRef;
  }>;

  const displayName = profile.full_name ?? profile.username ?? "Корисник";

  return (
    <Shell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-5">
        {/* ── Profile header ── */}
        <section className="rounded-3xl border border-[#e4ece8] bg-white p-5">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <Image
                src={cdnUrl(profile.avatar_url)}
                alt={displayName}
                width={72}
                height={72}
                sizes="72px"
                className="w-18 h-18 rounded-2xl border border-[#dce6e2] object-cover shrink-0"
              />
            ) : (
              <AvatarInitials
                name={displayName}
                avatarUrl={null}
                size="md"
              />
            )}
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {displayName}
              </h1>
              {profile.username && (
                <p className="text-sm text-slate-500">@{profile.username}</p>
              )}
              <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                <span>
                  <span className="font-semibold text-slate-800">{myIssues.length}</span>{" "}
                  пријави
                </span>
                <span>
                  <span className="font-semibold text-slate-800">{helperActivity.length}</span>{" "}
                  помогнал/а
                </span>
                <span>
                  <span className="font-semibold text-slate-800">{affectedActivity.length}</span>{" "}
                  засегнат/а
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Submitted issues ── */}
        <section className="rounded-3xl border border-[#e4ece8] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Пријави</h2>
            <span className="rounded-lg bg-[#eef8f5] px-2 py-1 text-xs font-semibold text-primary">
              {myIssues.length}
            </span>
          </div>

          {myIssues.length === 0 ? (
            <p className="text-sm text-slate-500">Нема поднесени пријави.</p>
          ) : (
            <div className="space-y-2">
              {myIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={getIssuePath(issue.id, issue.title)}
                  className="block rounded-2xl border border-[#e4ece8] px-3 py-2.5 hover:border-[#cfe0da] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {issue.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill status={issue.status as never} />
                      <span className="text-xs text-slate-400">
                        {formatDays(issue.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {DISTRICT_LABELS[issue.district] ?? issue.district}
                    {issue.description && (
                      <> · <span className="line-clamp-1">{issue.description}</span></>
                    )}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Activity ── */}
        {(helperActivity.length > 0 || affectedActivity.length > 0) && (
          <section className="rounded-3xl border border-[#e4ece8] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Активност</h2>
              <span className="rounded-lg bg-[#eef2f7] px-2 py-1 text-xs font-semibold text-slate-700">
                {helperActivity.length + affectedActivity.length}
              </span>
            </div>

            <div className="space-y-2">
              {helperActivity.map((item) => (
                <Link
                  key={`helper-${item.issue_id}`}
                  href={getIssuePath(
                    item.issue_id,
                    item.issues?.title ?? `issue-${item.issue_id}`,
                  )}
                  className="block rounded-2xl border border-[#d9f0e9] bg-[#f6fdfb] px-3 py-2 hover:border-[#bfe3db] transition-colors">
                  <p className="text-sm font-semibold text-slate-800">
                    🤝 {item.issues?.title ?? `Пријава #${item.issue_id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.note?.trim()
                      ? `"${item.note}"`
                      : "Се пријавил/а за помош"}
                  </p>
                </Link>
              ))}

              {affectedActivity.map((item) => (
                <Link
                  key={`affected-${item.issue_id}`}
                  href={getIssuePath(
                    item.issue_id,
                    item.issues?.title ?? `issue-${item.issue_id}`,
                  )}
                  className="block rounded-2xl border border-[#e3e8f3] bg-[#f8faff] px-3 py-2 hover:border-[#cfd7ea] transition-colors">
                  <p className="text-sm font-semibold text-slate-800">
                    ⚠️ {item.issues?.title ?? `Пријава #${item.issue_id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Засегнат/а од овој проблем
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
