import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import AgencyAlertComposer from "../../../../components/agency/AgencyAlertComposer";
import AgencyPostCard from "../../../../components/agency/AgencyPostCard";
import { AGENCIES, type AgencyId } from "../../../../lib/agencies";
import type { AgencyPost } from "../../../../lib/types/database";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AgencyPage({ params }: Props) {
  const { slug } = await params;
  const agency = AGENCIES[slug as AgencyId];
  if (!agency) notFound();

  const supabase = await createClient();

  const [{ data: authUser }, { data: posts }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("agency_posts")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Can the current user publish for this agency? (its operator, or an admin)
  let canPost = false;
  const user = authUser.user;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, is_admin")
      .eq("id", user.id)
      .maybeSingle();
    canPost =
      profile?.is_admin === true || profile?.agency_id === agency.id;
  }

  const list = (posts as AgencyPost[] | null) ?? [];

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-bold text-theme-heading">{agency.name}</h1>
        <p className="text-xs text-theme-muted">
          Официјални соопштенија и алармирања
        </p>
      </div>

      {canPost && <AgencyAlertComposer />}

      <div className="space-y-3">
        {list.length > 0 ? (
          list.map((post) => <AgencyPostCard key={post.id} post={post} />)
        ) : (
          <p className="text-xs text-theme-subtle">Нема соопштенија.</p>
        )}
      </div>
    </div>
  );
}
