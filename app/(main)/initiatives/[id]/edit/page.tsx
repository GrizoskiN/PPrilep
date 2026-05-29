import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import NewInitiativeForm from "../../../../../components/initiatives/NewInitiativeForm";
import type { Initiative } from "../../../../../lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditInitiativePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=/initiatives/${id}/edit`);
  }

  const { data: initiative } = await supabase
    .from("initiatives")
    .select("*")
    .eq("id", id)
    .single<Initiative>();

  if (!initiative) notFound();

  // Only the author or an admin may edit
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  if (initiative.user_id !== user.id && !isAdmin) {
    redirect("/initiatives");
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <h1 className="text-base font-semibold text-theme-heading">
          Уреди иницијатива
        </h1>
        <p className="text-xs text-theme-muted">
          Измените ги деталите и зачувајте ги промените.
        </p>
      </header>

      <NewInitiativeForm initiative={initiative} />
    </div>
  );
}
