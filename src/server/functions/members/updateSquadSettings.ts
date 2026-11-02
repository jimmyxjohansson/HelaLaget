import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import { normalizeFeedUrl } from '@/server/svenskalag/sync'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = {
  name: string
  primaryColor: string
  accentColor: string
  logoUrl?: string | null
  planningUrl?: string | null
  /** Lagets kalenderlänk från Svenskalag (webcal:// eller https://). */
  svenskalagIcalUrl?: string | null
  /** Lagets sida på Svenskalag, visas i menyn under Mina lag. */
  svenskalagUrl?: string | null
}

const COLOR = /^#[0-9a-fA-F]{6}$/
const URL_OR_EMPTY = (v: string | null | undefined) => !v || /^https:\/\//.test(v)

/** Lagets namn, färger, logga och länkar till externa appar. */
export default async function updateSquadSettings(req: { params: Params; user: User; squad?: SquadAccess }) {
  const p = req.params
  if (!p.name?.trim()) throw new AccessError('Laget måste ha ett namn.', 400)
  if (!COLOR.test(p.primaryColor) || !COLOR.test(p.accentColor)) {
    throw new AccessError('Färgerna anges som #RRGGBB.', 400)
  }
  // "svenskalag.se/..." utan https:// fungerar också
  let siteUrl = p.svenskalagUrl?.trim() || null
  if (siteUrl && !/^https?:\/\//i.test(siteUrl)) siteUrl = `https://${siteUrl}`
  if (siteUrl) siteUrl = siteUrl.replace(/^http:\/\//i, 'https://')
  if (![p.logoUrl, p.planningUrl, siteUrl].every(URL_OR_EMPTY)) {
    throw new AccessError('Länkar måste börja med https://', 400)
  }
  let feedUrl: string | null = null
  if (p.svenskalagIcalUrl?.trim()) {
    try {
      feedUrl = normalizeFeedUrl(p.svenskalagIcalUrl)
    } catch (e) {
      throw new AccessError((e as Error).message, 400)
    }
  }
  await adminDb.query(
    `UPDATE squads SET name = $2, primary_color = $3, accent_color = $4,
       logo_url = $5, planning_url = $6, svenskalag_ical_url = $7,
       svenskalag_url = $8
     WHERE id = $1`,
    [
      req.squad!.squadId,
      p.name.trim(),
      p.primaryColor,
      p.accentColor,
      p.logoUrl || null,
      p.planningUrl || null,
      feedUrl,
      siteUrl,
    ],
  )
  return { ok: true }
}
