import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import { parseMemberRole, setLinkedPlayers, type MemberRole } from '@/server/members-kind'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = {
  userId: string
  approve: boolean
  role?: MemberRole | 'viewer'
  /** Spelare i laget som en Spelare/Anhörig kopplas till */
  playerIds?: number[]
}

/** Godkänn (med roll och kopplade spelare) eller neka en ansökan till laget. */
export default async function decideMember(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { userId, approve } = req.params
  const { role, kind } = parseMemberRole(req.params.role ?? 'relative')

  const { data } = await adminDb.query(
    `UPDATE squad_members
     SET status = $3::membership_status, role = $4::squad_role, member_kind = $6,
         decided_at = now(), decided_by = $5
     WHERE squad_id = $1 AND user_id = $2
     RETURNING user_id`,
    [req.squad!.squadId, userId, approve ? 'approved' : 'rejected', role, req.user.id, kind],
  )
  if (!data.length) throw new AccessError('Hittade inte ansökan.', 404)
  if (approve) await setLinkedPlayers(req.squad!.squadId, userId, kind ? req.params.playerIds : [])
  return { ok: true }
}
