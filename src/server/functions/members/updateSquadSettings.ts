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
  /** Lagets sida (t.ex. på Svenskalag) och namnet på länken i menyn */
  siteUrl?: string | null
  siteName?: string | null
  /** Lagets dokument (t.ex. en delad mapp) och namnet på länken i menyn */
  docsUrl?: string | null
  docsName?: string | null
}

/** "svenskalag.se/..." utan https:// fungerar också; http blir https. */
function linkUrl(value: string | null | undefined) {
  let url = value?.trim() || null
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
  if (url) url = url.replace(/^http:\/\//i, 'https://')
  return url
}

const linkName = (value: string | null | undefined) => value?.trim().slice(0, 40) || null

const COLOR = /^#[0-9a-fA-F]{6}$/
const URL_OR_EMPTY = (v: string | null | undefined) => !v || /^https:\/\//.test(v)

/** Lagets namn, färger, logga och länkar till externa appar. */
export default async function updateSquadSettings(req: { params: Params; user: User; squad?: SquadAccess }) {
  const p = req.params
  if (!p.name?.trim()) throw new AccessError('Laget måste ha ett namn.', 400)
  if (!COLOR.test(p.primaryColor) || !COLOR.test(p.accentColor)) {
    throw new AccessError('Färgerna anges som #RRGGBB.', 400)
  }
  const siteUrl = linkUrl(p.siteUrl)
  const docsUrl = linkUrl(p.docsUrl)
  if (![p.logoUrl, p.planningUrl, siteUrl, docsUrl].every(URL_OR_EMPTY)) {
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
       svenskalag_url = $8, site_name = $9, docs_url = $10, docs_name = $11
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
      siteUrl ? linkName(p.siteName) : null,
      docsUrl,
      docsUrl ? linkName(p.docsName) : null,
    ],
  )
  return { ok: true }
}
