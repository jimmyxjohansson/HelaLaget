import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = {
  userId: string
  approve: boolean
  role?: 'viewer' | 'leader' | 'admin'
}

/** Godkänn (med roll) eller neka en ansökan till laget. */
export default async function decideMember(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { userId, approve } = req.params
  const role = req.params.role ?? 'viewer'
  if (!['viewer', 'leader', 'admin'].includes(role)) throw new AccessError('Okänd roll.', 400)

  const { data } = await adminDb.query(
    `UPDATE squad_members
     SET status = $3::membership_status, role = $4::squad_role, decided_at = now(), decided_by = $5
     WHERE squad_id = $1 AND user_id = $2
     RETURNING user_id`,
    [req.squad!.squadId, userId, approve ? 'approved' : 'rejected', role, req.user.id],
  )
  if (!data.length) throw new AccessError('Hittade inte ansökan.', 404)
  return { ok: true }
}
