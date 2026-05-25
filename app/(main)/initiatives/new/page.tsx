import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import NewInitiativeForm from "../../../../components/initiatives/NewInitiativeForm";

export default async function NewInitiativePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/initiatives/new");
  }

  return (
    <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
      <header>
        <h1 className="text-base font-semibold text-theme-heading">
          Нова иницијатива
        </h1>
        <p className="text-xs text-theme-muted">
          Опишете ја идејата за да може да собира гласови.
        </p>
      </header>

      <NewInitiativeForm />
    </div>
  );
}
