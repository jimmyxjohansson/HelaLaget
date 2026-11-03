import { adminDb } from '@/server/db'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = Record<string, never>

/** Lagets medlemmar och ansökningar (väntande först). */
export default async function getMembers(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { data } = await adminDb.query<{
    userId: string
    email: string | null
    name: string | null
    role: 'viewer' | 'leader' | 'admin'
    /** Läsbehörighet som Spelare eller Anhörig */
    memberKind: 'player' | 'relative' | null
    playerIds: number[]
    status: 'pending' | 'approved' | 'rejected'
    message: string | null
    requestedAt: string
    isMe: boolean
  }>(
    `SELECT m.user_id AS "userId", u.email, u.raw_user_meta_data->>'name' AS name,
       m.role::text AS role,
       CASE WHEN m.role = 'viewer' THEN COALESCE(m.member_kind, 'relative') END AS "memberKind",
       COALESCE((SELECT array_agg(smp.player_id) FROM squad_member_players smp
                 WHERE smp.squad_id = m.squad_id AND smp.user_id = m.user_id), '{}') AS "playerIds",
       m.status::text AS status, m.message, m.requested_at AS "requestedAt",
       m.user_id = $2 AS "isMe"
     FROM squad_members m JOIN auth.users u ON u.id = m.user_id
     WHERE m.squad_id = $1
     ORDER BY (m.status = 'pending') DESC, (m.status = 'rejected'), lower(coalesce(u.raw_user_meta_data->>'name', u.email))`,
    [req.squad!.squadId, req.user.id],
  )
  return data.map((m) => ({ ...m, playerIds: (m.playerIds ?? []).map(Number) }))
}
