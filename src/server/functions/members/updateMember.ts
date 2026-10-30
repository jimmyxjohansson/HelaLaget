import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = {
  userId: string
  role: 'viewer' | 'leader' | 'admin'
}

/** Ändra en medlems roll i laget. */
export default async function updateMember(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { userId, role } = req.params
  if (!['viewer', 'leader', 'admin'].includes(role)) throw new AccessError('Okänd roll.', 400)
  if (userId === req.user.id) throw new AccessError('Du kan inte ändra din egen roll. Be en annan admin.', 400)

  const { data } = await adminDb.query(
    `UPDATE squad_members SET role = $3::squad_role
     WHERE squad_id = $1 AND user_id = $2 AND status = 'approved'
     RETURNING user_id`,
    [req.squad!.squadId, userId, role],
  )
  if (!data.length) throw new AccessError('Hittade inte medlemmen.', 404)
  return { ok: true }
}
