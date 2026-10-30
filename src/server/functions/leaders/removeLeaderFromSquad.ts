import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { leaderId: number }

/** Ta bort ledaren från lagets ledarlista. Ledaren och historiken finns kvar i föreningen. */
export default async function removeLeaderFromSquad(req: { params: Params; user: User }) {
  await db.query('DELETE FROM squad_leaders WHERE squad_id = app.squad_id() AND leader_id = $1', [req.params.leaderId])
  return { ok: true }
}
