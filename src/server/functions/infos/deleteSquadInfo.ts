import { adminDb } from '@/server/db'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

/** Tar bort en informationsruta i valt lag. */
export default async function deleteSquadInfo(req: { params: { id: number }; user: User; squad?: SquadAccess }) {
  await adminDb.query(`DELETE FROM squad_infos WHERE id = $1 AND squad_id = $2`, [Number(req.params.id), req.squad!.squadId])
  return { ok: true }
}
