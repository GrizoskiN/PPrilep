'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '../supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types/database'

export function useAuth() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    const { data: { user } } = await supabase.auth.getUser()
    const metaAvatar   = user?.user_metadata?.avatar_url ?? null
    const metaName     = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
    // Derive a username suggestion from email: "mario.lukas@gmail.com" → "mario.lukas"
    const emailPrefix  = user?.email?.split("@")[0]?.replace(/[^a-z0-9._-]/gi, "") ?? null

    if (error && error.code === 'PGRST116') {
      // Profile row missing — create it now
      await supabase.from('profiles').upsert({
        id: userId,
        full_name:  metaName,
        avatar_url: metaAvatar,
        username:   emailPrefix,
      })
      const { data: created } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(created)
    } else {
      // Sync any missing fields from OAuth metadata
      const updates: Record<string, string> = {}
      if (data && !data.avatar_url && metaAvatar)  updates.avatar_url = metaAvatar
      if (data && !data.full_name  && metaName)    updates.full_name  = metaName
      if (data && !data.username   && emailPrefix) updates.username   = emailPrefix

      if (data && Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', userId)
        setProfile({ ...data, ...updates })
      } else {
        setProfile(data)
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signOut }
}
