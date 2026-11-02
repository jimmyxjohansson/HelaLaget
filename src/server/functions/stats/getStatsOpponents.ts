import { db } from '@/server/db'
import { NOW_WALLCLOCK, betweenDatesOf } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  from?: string | null
  to?: string | null
}

/**
 * Lagen vi mött under perioden, med ort och koordinater för kartan och
 * resultaten mot varje lag.
 */
export default async function getStatsOpponents(req: { params: Params; user: User }) {
  const from = req.params.from || null
  const to = req.params.to || null
  const { data } = await db.query<{
    id: number
    team: string | null
    imgurl: string | null
    city: string | null
    country: string | null
    lat: number | null
    lng: number | null
    matches: number
    won: number
    drawn: number
    lost: number
    goals_for: number
    goals_against: number
  }>(
    `SELECT t.id, t.team, t.imgurl, t.city, t.country, t.lat, t.lng,
            COUNT(m.id)::int AS matches,
            COUNT(*) FILTER (WHERE m.outcome::text = 'Vinst')::int AS won,
            COUNT(*) FILTER (WHERE m.outcome::text = 'Oavgjort')::int AS drawn,
            COUNT(*) FILTER (WHERE m.outcome::text = 'Förlust')::int AS lost,
            COALESCE(SUM(m.ourgoals) FILTER (WHERE m.status::text IN ('Avslutad', 'Registrerad i Fogis')), 0)::int AS goals_for,
            COALESCE(SUM(m.theirgoals) FILTER (WHERE m.status::text IN ('Avslutad', 'Registrerad i Fogis')), 0)::int AS goals_against
     FROM matches m
     JOIN teams t ON t.id = m.vs
     WHERE (m.status::text IN ('Avslutad', 'Registrerad i Fogis') OR m.date <= ${NOW_WALLCLOCK})
       AND ${betweenDatesOf('m.date', '$1', '$2')}
     GROUP BY t.id
     ORDER BY COUNT(m.id) DESC, t.team`,
    [from, to],
  )
  return data
}
