'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types/database'

export function useAuth() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error && error.code === 'PGRST116') {
      // Profile row missing (trigger didn't run or user predates it) — create it now
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: user?.user_metadata?.full_name ?? null,
        avatar_url: user?.user_metadata?.avatar_url ?? null,
      })
      const { data: created } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(created)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signOut }
}
