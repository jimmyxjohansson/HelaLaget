'use client'

import { createClient } from './supabase/client'

/** Motsvarar NavLink i react-router: '/' matchar exakt, övriga även undersidor. */
export function isActivePath(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export async function signOut() {
  await createClient().auth.signOut()
  window.location.href = '/login'
}
