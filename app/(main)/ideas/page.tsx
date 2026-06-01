"use client";

import { useEffect, useMemo, useState } from "react";
import IdeaCard from "../../../components/ideas/IdeaCard";
import NewIdeaModal from "../../../components/ideas/NewIdeaModal";
import { useAuth } from "../../../lib/hooks/useAuth";
import { createClient } from "../../../lib/supabase/client";
import Button from "../../../components/ui/Button";
import { Plus } from "lucide-react";
import type { Idea } from "../../../lib/types/database";

export default function IdeasPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("ideas")
      .select(`*, profiles(full_name, avatar_url, username, membership_tier, points)`)
      .order("upvotes", { ascending: false });
    if (data) setIdeas(data);
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => load(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-theme-heading">
              Идеи на граѓани
            </h1>
            <p className="text-xs text-theme-muted">
              Споделете и гласајте за идеи за подобар Прилеп
            </p>
          </div>
          {user && (
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus size={13} /> Нова идеја
            </Button>
          )}
        </div>

        {loading && (
          <p className="text-xs text-theme-subtle">Се вчитуваат идеи…</p>
        )}
        <div className="space-y-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              userId={user?.id}
              isAdmin={profile?.is_admin === true}
              onDeleted={load}
            />
          ))}
        </div>
        {!loading && ideas.length === 0 && (
          <p className="text-xs text-theme-subtle">Сè уште нема идеи.</p>
        )}
      </div>

      {newOpen && user && (
        <NewIdeaModal
          userId={user.id}
          onClose={() => setNewOpen(false)}
          onSuccess={() => {
            setNewOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}
