import { db } from '@/server/db'
import { notifyFinished } from '@/server/notifications/match'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  id: number
}

export default async function finishMatch(req: { params: Params; user: User; squad?: SquadAccess }) {
  const id = req.params.id

  const current = await db.query<{ ourgoals: number; theirgoals: number; status: string | null }>(
    `SELECT ourgoals, theirgoals, status::text AS status FROM matches WHERE id = $1`,
    [id]
  )

  const row = current.data[0]
  if (!row) {
    throw new Error('Matchen hittades inte.')
  }

  const ourgoals = Number(row.ourgoals)
  const theirgoals = Number(row.theirgoals)

  const outcome =
    ourgoals > theirgoals ? 'Vinst' : theirgoals > ourgoals ? 'Förlust' : 'Oavgjort'

  await db.query(
    `UPDATE matches SET status = 'Avslutad', outcome = $1,
       clock_started_at = NULL, clock_period = NULL, clock_offset_minutes = NULL, clock_period_start_minutes = NULL
     WHERE id = $2`,
    [outcome, id]
  )

  if (row.status !== 'Avslutad' && req.squad) {
    notifyFinished({ squadId: req.squad.squadId, matchId: id, userId: req.user.id })
  }

  return { success: true, outcome }
}
