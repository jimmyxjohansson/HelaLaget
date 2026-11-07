import { db } from '@/server/db'
import { NOW_WALLCLOCK } from '@/server/attendance'
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
    difficulty: string | null
    matchplayers: string | null
    ourgoals: number
    theirgoals: number
    periods: number | null
    clock_started_at: string | null
    clock_period: number | null
    clock_offset_minutes: number | null
    clock_period_start_minutes: number | null
    server_now: string
    live: boolean
    /** Spelare med svar Kommer */
    players_coming: number
  }>(
    `SELECT
      m.id, m.matchtype, m.date, m.homeaway, m.indooroutdoor, m.outcome,
      m.status, m.location, m.notes, m.teamname, m.cup, m.cupphase, m.fogisregistered,
      m.difficulty::text AS difficulty, m.matchplayers::text AS matchplayers,
      t.team AS opponent,
      t.imgurl AS opponent_img,
      l.name AS league_name,
      COALESCE(m.ourgoals, 0)::int AS ourgoals, COALESCE(m.theirgoals, 0)::int AS theirgoals, m.periods,
      m.clock_started_at, m.clock_period, m.clock_offset_minutes, m.clock_period_start_minutes,
      now() AS server_now,
      (SELECT COUNT(*)::int FROM participantsmatches pm WHERE pm.match = m.id AND pm.player IS NOT NULL AND pm.status = 'Kommer') AS players_coming,
      (m.status::text NOT IN ('Avslutad', 'Registrerad i Fogis') AND (
        (m.clock_started_at IS NOT NULL AND m.clock_started_at > now() - interval '6 hours')
        OR (m.date <= ${NOW_WALLCLOCK} AND m.date > ${NOW_WALLCLOCK} - interval '3 hours')
        -- Mål registrerade i dag på en match som inte är avslutad: den pågår
        OR (COALESCE(m.ourgoals, 0) + COALESCE(m.theirgoals, 0) > 0 AND m.date <= ${NOW_WALLCLOCK}
            AND (m.date AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'Europe/Stockholm')::date))) AS live
    FROM matches m
    LEFT JOIN teams t ON t.id = m.vs
    LEFT JOIN leagues l ON l.id = m.league
    -- Kommande veckan, plus matcher som pågår just nu (de visas först med resultat och klocka)
    WHERE ((m.date >= ${NOW_WALLCLOCK} AND m.date <= ${NOW_WALLCLOCK} + INTERVAL '7 days') OR (m.status::text NOT IN ('Avslutad', 'Registrerad i Fogis') AND (
        (m.clock_started_at IS NOT NULL AND m.clock_started_at > now() - interval '6 hours')
        OR (m.date <= ${NOW_WALLCLOCK} AND m.date > ${NOW_WALLCLOCK} - interval '3 hours')
        -- Mål registrerade i dag på en match som inte är avslutad: den pågår
        OR (COALESCE(m.ourgoals, 0) + COALESCE(m.theirgoals, 0) > 0 AND m.date <= ${NOW_WALLCLOCK}
            AND (m.date AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'Europe/Stockholm')::date))))
      AND NOT (m.fogisregistered = true AND m.matchtype = 'Serie')
    ORDER BY live DESC, m.date ASC
    LIMIT $1`,
    [limit]
  )
  return result.data
}
