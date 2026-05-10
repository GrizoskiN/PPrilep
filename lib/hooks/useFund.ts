'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../supabase/client'
import type { FundCampaign } from '../types/database'

export function useFund() {
  const supabase = useMemo(() => createClient(), [])
  const [campaigns, setCampaigns] = useState<FundCampaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('fund_campaigns')
      .select(`*, profiles(full_name, username)`)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setCampaigns(data)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { campaigns, loading }
}
