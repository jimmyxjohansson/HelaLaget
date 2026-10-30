import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { playerIds: number[] }

/** Koppla befintliga spelare i föreningen till valt lag (t.ex. lån). */
export default async function addPlayersToSquad(req: { params: Params; user: User }) {
  await db.query(
    `INSERT INTO squad_players (squad_id, player_id)
     SELECT app.squad_id(), unnest($1::int[])
     ON CONFLICT DO NOTHING`,
    [req.params.playerIds ?? []],
  )
  return { ok: true }
}
