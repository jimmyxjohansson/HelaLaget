import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { leaderIds: number[] }

/** Koppla befintliga ledare i föreningen till valt lag. */
export default async function addLeadersToSquad(req: { params: Params; user: User }) {
  await db.query(
    `INSERT INTO squad_leaders (squad_id, leader_id)
     SELECT app.squad_id(), unnest($1::int[])
     ON CONFLICT DO NOTHING`,
    [req.params.leaderIds ?? []],
  )
  return { ok: true }
}
