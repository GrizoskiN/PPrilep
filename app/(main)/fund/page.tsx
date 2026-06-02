"use client";

import { useState } from "react";
import CampaignCard from "../../../components/fund/CampaignCard";
import ProposeModal from "../../../components/fund/ProposeModal";
import { useFund } from "../../../lib/hooks/useFund";
import { useAuth } from "../../../lib/hooks/useAuth";
import Button from "../../../components/ui/Button";
import { Plus } from "lucide-react";

export default function FundPage() {
  const { campaigns, loading } = useFund();
  const { user } = useAuth();
  const [proposeOpen, setProposeOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-theme-heading">
              Фонд кампањи
            </h1>
            <p className="text-xs text-theme-muted">
              Граѓанско финансирање за подобрување на градот
            </p>
          </div>
          {user && (
            <Button size="sm" onClick={() => setProposeOpen(true)}>
              <Plus size={13} /> Предложи
            </Button>
          )}
        </div>

        {loading && (
          <p className="text-xs text-theme-subtle">Се вчитуваат кампањи…</p>
        )}
        <div className="space-y-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
        {!loading && campaigns.length === 0 && (
          <p className="text-xs text-theme-subtle">
            Сè уште нема кампањи. Бидете први!
          </p>
        )}
      </div>

      {proposeOpen && user && (
        <ProposeModal
          userId={user.id}
          onClose={() => setProposeOpen(false)}
          onSuccess={() => setProposeOpen(false)}
        />
      )}
    </>
  );
}
