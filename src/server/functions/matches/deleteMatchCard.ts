import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { id: number; matchId: number }

/** Tar bort ett kort från matchens tidslinje. */
export default async function deleteMatchCard(req: { params: Params; user: User }) {
  await db.query('DELETE FROM matchcards WHERE id = $1 AND match = $2', [req.params.id, req.params.matchId])
  return { ok: true }
}
