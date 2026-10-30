import { db } from '@/server/db'
import { notifyFinished } from '@/server/notifications/match'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  id: number
  matchtype: string
  vs: number | null
  date: string
  homeaway: string
  status: string
  ourgoals: number | null
  theirgoals: number | null
  outcome: string
  location: string | null
  notes: string | null
  league: number | null
  cup: number | null
  cupphase: string | null
  fogisno: string | null
  fogislink: string | null
  teamname: string | null
  indooroutdoor: string
  matchplayers: string | null
  playtime: number | null
  periods: number | null
  difficulty: string | null
  svenskalag: string | null
}

export default async function updateMatch(req: { params: Params; user: User; squad?: SquadAccess }) {
  const p = req.params

  const { data: before } = await db.query<{ status: string | null }>(
    'SELECT status::text AS status FROM matches WHERE id = $1',
    [p.id],
  )

  await db.query(
    `UPDATE matches SET
      matchtype     = $1,
      vs            = $2,
      date          = $3,
      homeaway      = $4,
      status        = $5,
      ourgoals      = $6,
      theirgoals    = $7,
      outcome       = $8,
      location      = $9,
      notes         = $10,
      league        = $11,
      teamname      = $12,
      indooroutdoor = $13,
      playtime      = $14,
      periods       = $15,
      difficulty    = $16,
      fogislink     = $17,
      svenskalag    = $18,
      cupphase      = $19,
      cup           = $20,
      fogisno       = $21,
      matchplayers  = $22
    WHERE id = $23`,
    [
      p.matchtype,
      p.vs,
      p.date,
      p.homeaway,
      p.status,
      p.ourgoals,
      p.theirgoals,
      p.outcome,
      p.location,
      p.notes,
      p.league,
      p.teamname,
      p.indooroutdoor,
      p.playtime,
      p.periods,
      p.difficulty,
      p.fogislink,
      p.svenskalag,
      p.cupphase,
      p.cup,
      p.fogisno,
      p.matchplayers,
      p.id,
    ]
  )

  // Satt till Avslutad: stoppa matchklockan och skicka notis med slutresultatet
  if (p.status === 'Avslutad' && before[0] && before[0].status !== 'Avslutad') {
    await db.query(
      `UPDATE matches SET clock_started_at = NULL, clock_period = NULL,
         clock_offset_minutes = NULL, clock_period_start_minutes = NULL
       WHERE id = $1`,
      [p.id],
    )
    if (req.squad) notifyFinished({ squadId: req.squad.squadId, matchId: p.id, userId: req.user.id })
  }

  return { success: true }
}
