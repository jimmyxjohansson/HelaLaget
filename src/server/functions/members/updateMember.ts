import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import { parseMemberRole, setLinkedPlayers, type MemberRole } from '@/server/members-kind'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = {
  userId: string
  role: MemberRole | 'viewer'
  /** Spelare i laget som en Spelare/Anhörig kopplas till. Utelämnat = oförändrat. */
  playerIds?: number[]
}

/** Ändra en medlems roll i laget, och vilka spelare en Spelare/Anhörig är kopplad till. */
export default async function updateMember(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { userId } = req.params
  const { role, kind } = parseMemberRole(req.params.role)
  if (userId === req.user.id) throw new AccessError('Du kan inte ändra din egen roll. Be en annan admin.', 400)

  const { data } = await adminDb.query(
    `UPDATE squad_members SET role = $3::squad_role, member_kind = $4
     WHERE squad_id = $1 AND user_id = $2 AND status = 'approved'
     RETURNING user_id`,
    [req.squad!.squadId, userId, role, kind],
  )
  if (!data.length) throw new AccessError('Hittade inte medlemmen.', 404)
  if (!kind) await setLinkedPlayers(req.squad!.squadId, userId, [])
  else if (req.params.playerIds) await setLinkedPlayers(req.squad!.squadId, userId, req.params.playerIds)
  return { ok: true }
}
