'use client'

import type { Membership } from '@/server/functions/account/getMe'

export type { Membership }

export type Me = {
  user: { id: string; email: string | null; name: string | null }
  isSuperadmin: boolean
  adminOrganizationIds: number[]
  memberships: Membership[]
  current: Membership | null
}

/**
 * Valt lag och inloggad användare. Sätts av SquadProvider innan vyerna
 * renderas; byte av lag laddar om sidan, så värdet ändras aldrig under tiden
 * en vy visas.
 */
let me: Me | null = null

export function setMe(value: Me | null) {
  me = value
}

export function getMe(): Me | null {
  return me
}

export function currentSquad(): Membership | null {
  return me?.current ?? null
}

export function canEdit(): boolean {
  const role = me?.current?.role
  return role === 'leader' || role === 'admin'
}

/** Spelare eller Anhörig (läsbehörighet): ser men ändrar inget. */
export function isReadOnly(): boolean {
  return me?.current?.role === 'viewer'
}

/** Spelarna en Spelare/Anhörig är kopplad till (tom lista för ledare och admin). */
export function linkedPlayerIds(): number[] {
  return me?.current?.role === 'viewer' ? me.current.linkedPlayerIds ?? [] : []
}

/** Rollens namn i appen: Spelare, Anhörig, Ledare eller Admin. */
export function roleLabel(m: { role: string; memberKind?: string | null } | null | undefined): string {
  if (!m) return ''
  if (m.role === 'viewer') return m.memberKind === 'player' ? 'Spelare' : 'Anhörig'
  return m.role === 'admin' ? 'Admin' : 'Ledare'
}

/** Hex (#RRGGBB) → "r g b" för CSS-variablerna --team-primary/--team-accent. */
export function hexToRgbChannels(hex: string): string | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : null
}
