import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  matchtype: string
  vs: number | null
  date: string
  homeaway: string
  indooroutdoor: string
  location: string | null
  teamname: string | null
  league: number | null
  cup: number | null
  cupphase: string | null
  fogisno: string | null
  fogislink: string | null
  matchplayers: string | null
  playtime: number | null
  periods: number | null
  difficulty: string | null
  svenskalag: string | null
  notes: string | null
}

export default async function createMatch(req: { params: Params; user: User }) {
  const p = req.params

  const result = await db.query<{ id: number }>(
    `INSERT INTO matches
      (matchtype, vs, date, homeaway, indooroutdoor, location, teamname,
       league, cup, cupphase, fogisno, fogislink, matchplayers, playtime,
       periods, difficulty, svenskalag, notes, status, fogisregistered)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
             $15, $16, $17, $18, 'Ny', $9::int IS NOT NULL)
     RETURNING id`,
    [
      p.matchtype,
      p.vs,
      p.date,
      p.homeaway,
      p.indooroutdoor,
      p.location,
      p.teamname,
      p.league,
      p.cup,
      p.cupphase,
      p.fogisno,
      p.fogislink,
      p.matchplayers,
      p.playtime,
      p.periods,
      p.difficulty,
      p.svenskalag,
      p.notes,
    ]
  )

  const id = result.data?.[0]?.id

  // When the match belongs to a cup, copy over the cup participants that have
  // status "Kommer" into the match participants (same status).
  if (id != null && p.cup != null) {
    await db.query(
      `INSERT INTO participantsmatches (match, player, leader, position, goalkeeper, status)
       SELECT $1, player, leader, position, goalkeeper, 'Kommer'
       FROM participantscups
       WHERE cup = $2 AND status = 'Kommer'`,
      [id, p.cup]
    )
  }

  return { id }
}
