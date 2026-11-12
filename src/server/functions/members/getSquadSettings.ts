import { adminDb } from '@/server/db'
import { isOrganizationAdmin } from '@/server/access'
import { orgFormats } from '@/server/gameFormats'
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
    gameFormat: string | null
    levelMatrix: string | null
    tacticsBoard: boolean
    tacticsKit: unknown | null
  }>(
    `SELECT s.id, s.name, o.name AS "organizationName", s.primary_color AS "primaryColor",
       s.accent_color AS "accentColor", s.logo_url AS "logoUrl", s.planning_url AS "planningUrl",
       s.join_code AS "joinCode",
       s.svenskalag_ical_url AS "svenskalagIcalUrl", s.svenskalag_url AS "siteUrl",
       s.site_name AS "siteName", s.docs_url AS "docsUrl", s.docs_name AS "docsName",
       s.game_format AS "gameFormat",
       s.level_matrix AS "levelMatrix",
       s.tactics_board AS "tacticsBoard",
       s.tactics_kit AS "tacticsKit"
     FROM squads s JOIN organizations o ON o.id = s.organization_id
     WHERE s.id = $1`,
    [req.squad!.squadId],
  )
  const row = data[0]
  if (!row) return null
  return {
    ...row,
    /** Föreningens speltid och perioder per spelform */
    formats: await orgFormats(req.squad!.organizationId),
    /** Bara föreningens admins ändrar standarden, eftersom den gäller alla lag */
    canEditFormats: await isOrganizationAdmin(req.user.id, req.squad!.organizationId),
  }
}
