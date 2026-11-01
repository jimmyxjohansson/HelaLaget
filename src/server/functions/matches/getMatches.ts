import { db } from '@/server/db'
import { NOW_WALLCLOCK } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  limit?: number
  matchtype?: string
}

export default async function (req: { params: Params; user: User }) {
  const { limit = 200, matchtype } = req.params
  const filterAll = !matchtype || matchtype === 'Alla'

  const baseQuery = `
    SELECT
      m.id,
      m.matchtype,
      m.date,
      m.difficulty,
      m.homeaway,
      m.ourgoals,
      m.theirgoals,
      m.matchplayers,
      m.indooroutdoor,
      m.outcome,
      m.status,
      m.location,
      m.notes,
      m.teamname,
      m.league,
      m.cup,
      m.cupphase,
      m.fogisregistered,
      t.team AS opponent,
      t.imgurl AS opponent_img,
      l.name AS league_name,
      m.periods, m.clock_started_at, m.clock_period, m.clock_offset_minutes, m.clock_period_start_minutes,
      now() AS server_now,
      (m.status::text NOT IN ('Avslutad', 'Registrerad i Fogis') AND (
        (m.clock_started_at IS NOT NULL AND m.clock_started_at > now() - interval '6 hours')
        OR (m.date <= ${NOW_WALLCLOCK} AND m.date > ${NOW_WALLCLOCK} - interval '3 hours')
        -- Mål registrerade i dag på en match som inte är avslutad: den pågår
        OR (COALESCE(m.ourgoals, 0) + COALESCE(m.theirgoals, 0) > 0 AND m.date <= ${NOW_WALLCLOCK}
            AND (m.date AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'Europe/Stockholm')::date))) AS live,
      (
        SELECT COUNT(*)
        FROM participantsmatches pm
        WHERE pm.match = m.id
          AND pm.player IS NOT NULL
          AND pm.status = 'Kommer'
      ) AS players_coming
    FROM matches m
    LEFT JOIN teams t ON t.id = m.vs
    LEFT JOIN leagues l ON l.id = m.league
  `

  const result = filterAll
    ? await db.query(
        baseQuery + ' WHERE 1=1 ORDER BY m.date DESC LIMIT $1',
        [limit]
      )
    : await db.query(
        baseQuery + ' WHERE m.matchtype = $1 ORDER BY m.date DESC LIMIT $2',
        [matchtype, limit]
      )

  return result.data
}
