import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = { userId: string }

/** Ta bort en medlem eller ansökan från laget. Kontot finns kvar. */
export default async function removeMember(req: { params: Params; user: User; squad?: SquadAccess }) {
  if (req.params.userId === req.user.id) throw new AccessError('Du kan inte ta bort dig själv.', 400)
  await adminDb.query('DELETE FROM squad_members WHERE squad_id = $1 AND user_id = $2', [
    req.squad!.squadId,
    req.params.userId,
  ])
  return { ok: true }
}
