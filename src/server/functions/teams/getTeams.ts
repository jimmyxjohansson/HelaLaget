import { db } from '@/server/db'
import type { User } from '@/server/types'

export default async function getTeams(_req: { params?: {}; user: User }) {
  const result = await db.query<{
    id: number
    team: string | null
    imgurl: string | null
    country: string | null
    matchcount: number
    won: number
    lost: number
    drawn: number
    goals_for: number
    goals_against: number
  }>(
    `SELECT
      t.id, t.team, t.imgurl, t.country,
      COUNT(m.id)::int AS matchcount,
      COUNT(CASE WHEN m.outcome::text = 'Vinst' THEN 1 END)::int AS won,
      COUNT(CASE WHEN m.outcome::text = 'Förlust' THEN 1 END)::int AS lost,
      COUNT(CASE WHEN m.outcome::text = 'Oavgjort' THEN 1 END)::int AS drawn,
      COALESCE(SUM(CASE WHEN m.status::text = 'Avslutad' THEN m.ourgoals END), 0)::int AS goals_for,
      COALESCE(SUM(CASE WHEN m.status::text = 'Avslutad' THEN m.theirgoals END), 0)::int AS goals_against
    FROM teams t
    LEFT JOIN matches m ON m.vs = t.id
    GROUP BY t.id, t.team, t.imgurl, t.country
    ORDER BY t.team`
  )
  return result.data
}
