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
    trainingAppUrl: string | null
    joinCode: string
  }>(
    `SELECT s.id, s.name, o.name AS "organizationName", s.primary_color AS "primaryColor",
       s.accent_color AS "accentColor", s.logo_url AS "logoUrl", s.planning_url AS "planningUrl",
       s.training_app_url AS "trainingAppUrl", s.join_code AS "joinCode"
     FROM squads s JOIN organizations o ON o.id = s.organization_id
     WHERE s.id = $1`,
    [req.squad!.squadId],
  )
  return data[0] ?? null
}
