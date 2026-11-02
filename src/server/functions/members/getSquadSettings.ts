import { adminDb } from '@/server/db'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = Record<string, never>

export default async function getSquadSettings(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { data } = await adminDb.query<{
    id: number
    name: string
    organizationName: string
    primaryColor: string
    accentColor: string
    logoUrl: string | null
    planningUrl: string | null
    joinCode: string
    svenskalagIcalUrl: string | null
    siteUrl: string | null
    siteName: string | null
    docsUrl: string | null
    docsName: string | null
  }>(
    `SELECT s.id, s.name, o.name AS "organizationName", s.primary_color AS "primaryColor",
       s.accent_color AS "accentColor", s.logo_url AS "logoUrl", s.planning_url AS "planningUrl",
       s.join_code AS "joinCode",
       s.svenskalag_ical_url AS "svenskalagIcalUrl", s.svenskalag_url AS "siteUrl",
       s.site_name AS "siteName", s.docs_url AS "docsUrl", s.docs_name AS "docsName"
     FROM squads s JOIN organizations o ON o.id = s.organization_id
     WHERE s.id = $1`,
    [req.squad!.squadId],
  )
  return data[0] ?? null
}
