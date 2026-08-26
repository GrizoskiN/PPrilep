/**
 * /sport/<slug>/uredi — the club's own editing screen.
 *
 * Access is checked here on the server and again in /api/sport/club. Anyone who
 * is not the bound owner (or an admin) gets a 404 rather than a "забрането":
 * the existence of an edit page for a club they do not run is not their
 * business, and a 403 would confirm the club has an owner.
 */

import { notFound } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { getClubAccess } from "../../../../../lib/sport/owner";
import { fetchSportClub } from "../../../../../lib/sanity/sport";
import EditClubForm from "./EditClubForm";
import NewsManager from "./NewsManager";

// Never prerendered: what it renders depends on who is asking.
export const dynamic = "force-dynamic";

export const metadata = { title: "Уреди го клубот — Мој Прилеп" };

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { clubSlug, isAdmin } = await getClubAccess(user.id);
  if (!isAdmin && clubSlug !== slug) notFound();

  const club = await fetchSportClub(slug);
  if (!club) notFound();

  return (
    <div className="space-y-8">
      <EditClubForm club={club} />
      <hr className="border-zinc-200" />
      <NewsManager slug={slug} clubName={club.name} />
    </div>
  );
}
