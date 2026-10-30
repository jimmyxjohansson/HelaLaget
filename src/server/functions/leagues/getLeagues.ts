import { db } from '@/server/db'
import type { User } from '@/server/types'

export default async function getLeagues(_req: { params: Record<string, never>; user: User }) {
  const result = await db.query<{
    id: number
    name: string
    status: string
    year: number | null
    season: string | null
    level: string | null
    age: string | null
    region: string | null
    match_count: number
    played_count: number
    wins: number
    draws: number
    losses: number
    goals_for: number
    goals_against: number
    last_date: string | null
  }>(
    `SELECT
      l.id,
      l.name,
      l.status,
      l.year,
      l.season,
      l.level,
      l.age,
      l.region,
      COUNT(m.id) AS match_count,
      COUNT(m.id) FILTER (WHERE m.status = 'Avslutad') AS played_count,
      COUNT(m.id) FILTER (WHERE m.outcome = 'Vinst') AS wins,
      COUNT(m.id) FILTER (WHERE m.outcome = 'Oavgjort') AS draws,
      COUNT(m.id) FILTER (WHERE m.outcome = 'Förlust') AS losses,
      COALESCE(SUM(m.ourgoals) FILTER (WHERE m.status = 'Avslutad'), 0) AS goals_for,
      COALESCE(SUM(m.theirgoals) FILTER (WHERE m.status = 'Avslutad'), 0) AS goals_against,
      MAX(m.date) AS last_date
    FROM leagues l
    LEFT JOIN matches m ON m.league = l.id
    GROUP BY l.id, l.name, l.status, l.year, l.season, l.level, l.age, l.region
    ORDER BY l.name`,
  )

  return result.data.map(r => ({
    ...r,
    match_count: Number(r.match_count),
    played_count: Number(r.played_count),
    wins: Number(r.wins),
    draws: Number(r.draws),
    losses: Number(r.losses),
    goals_for: Number(r.goals_for),
    goals_against: Number(r.goals_against),
  }))
}
