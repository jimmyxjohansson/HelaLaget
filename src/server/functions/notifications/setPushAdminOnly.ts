import { adminDb } from '@/server/db'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = { on: boolean }

/** Testläge för lagets notiser: bara lagets admin får dem, även för egna ändringar. */
export default async function setPushAdminOnly(req: { params: Params; user: User; squad?: SquadAccess }) {
  // Adminfunktioner körs utan RLS: bara valt lag
  await adminDb.query('UPDATE squads SET push_admin_only = $2 WHERE id = $1', [req.squad!.squadId, !!req.params.on])
  return { adminOnly: !!req.params.on }
}
