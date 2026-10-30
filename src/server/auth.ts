import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { User } from './types'

/** Returnerar inloggad användare, eller null. Verifieras mot Supabase Auth. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
}
