import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { playerId: number }

/** Ta bort spelaren från lagets spelarlista. Spelaren och historiken finns kvar i föreningen. */
export default async function removePlayerFromSquad(req: { params: Params; user: User }) {
  await db.query('DELETE FROM squad_players WHERE squad_id = app.squad_id() AND player_id = $1', [req.params.playerId])
  return { ok: true }
}
