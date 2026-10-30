import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  limit?: number
}

export default async function getUpcomingMatches(req: { params: Params; user: User }) {
  const limit = req.params.limit ?? 10

  const result = await db.query<{
    id: number
    matchtype: string
    date: string
    homeaway: string
    indooroutdoor: string
    outcome: string
    status: string
    location: string | null
    notes: string | null
    teamname: string | null
    opponent: string | null
    opponent_img: string | null
    league_name: string | null
    cup: number | null
    cupphase: string | null
    fogisregistered: boolean
  }>(
    `SELECT
      m.id, m.matchtype, m.date, m.homeaway, m.indooroutdoor, m.outcome,
      m.status, m.location, m.notes, m.teamname, m.cup, m.cupphase, m.fogisregistered,
      t.team AS opponent,
      t.imgurl AS opponent_img,
      l.name AS league_name
    FROM matches m
    LEFT JOIN teams t ON t.id = m.vs
    LEFT JOIN leagues l ON l.id = m.league
    WHERE m.date >= NOW()
      AND m.date <= NOW() + INTERVAL '7 days'
      AND NOT (m.fogisregistered = true AND m.matchtype = 'Serie')
    ORDER BY m.date ASC
    LIMIT $1`,
    [limit]
  )
  return result.data
}
