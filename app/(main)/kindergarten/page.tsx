import { createClient } from "../../../lib/supabase/server";
import KindergartenFeed from "../../../components/kindergarten/KindergartenFeed";

export default async function KindergartenPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("utility_posts")
    .select("*")
    .eq("provider", "kindergarten")
    .order("posted_at", { ascending: false });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm"
          style={{ background: "linear-gradient(135deg, #f9a8d4, #fb7185)" }}>
          🌸
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight">
            Градинки — Наша Иднина
          </h1>
          <p className="text-xs text-zinc-500">
            Мени, програми, идеи и соопштенија
          </p>
        </div>
      </div>

      <KindergartenFeed posts={posts ?? []} />
    </div>
  );
}
