import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  limit?: number
}

export default async function getCups(req: { params: Params; user: User }) {
  const { limit = 300 } = req.params

  const result = await db.query<{
    id: number
    name: string
    startdate: string | null
    enddate: string | null
    location: string | null
    difficulty: string | null
    playtime: number | null
    periods: number | null
    matchplayers: string | null
    indooroutdoor: string | null
    svenskalag: string | null
    status: string
    cupsite: string | null
    match_count: number
    wins: number
    draws: number
    losses: number
    goals_for: number
    goals_against: number
  }>(
    `SELECT
      c.id, c.name, c.startdate, c.enddate, c.location, c.difficulty,
      c.playtime, c.periods, c.matchplayers, c.indooroutdoor,
      c.svenskalag, c.status, c.cupsite,
      COUNT(m.id) AS match_count,
      COUNT(m.id) FILTER (WHERE m.outcome = 'Vinst') AS wins,
      COUNT(m.id) FILTER (WHERE m.outcome = 'Oavgjort') AS draws,
      COUNT(m.id) FILTER (WHERE m.outcome = 'Förlust') AS losses,
      COALESCE(SUM(m.ourgoals) FILTER (WHERE m.status = 'Avslutad'), 0) AS goals_for,
      COALESCE(SUM(m.theirgoals) FILTER (WHERE m.status = 'Avslutad'), 0) AS goals_against
    FROM cups c
    LEFT JOIN matches m ON m.cup = c.id
    GROUP BY c.id
    ORDER BY c.startdate DESC NULLS LAST, c.name
    LIMIT $1`,
    [limit]
  )

  return result.data.map(r => ({
    ...r,
    match_count: Number(r.match_count),
    wins: Number(r.wins),
    draws: Number(r.draws),
    losses: Number(r.losses),
    goals_for: Number(r.goals_for),
    goals_against: Number(r.goals_against),
  }))
}
