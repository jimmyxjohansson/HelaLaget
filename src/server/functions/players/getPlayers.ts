import { db } from '@/server/db'
import { ATTENDED_STATUSES, PAST_TRAINING, PLAYED_MATCH, withinMonths, withinMonthsOf } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  months?: number | null
}

export default async function getPlayers(req: { params: Params; user: User }) {
  // 0 means "all time"; positive integer means filter to last N months
  const months = req.params.months ?? 0

  const result = await db.query<{
    id: number
    firstname: string
    lastname: string
    shortname: string
    number: number
    img: string
    status: string
    rank: string | null
    defender: boolean
    defensivemidfielder: boolean
    offensivemidfielder: boolean
    winger: boolean
    striker: boolean
    goalkeeper: boolean
    sessions_attended: string
    total_sessions: string
    birthdate: string | null
    foot: string | null
    gender: string | null
    shirt_size: string | null
    shorts_size: string | null
    sock_size: string | null
    matches: number
    goals: number
    assists: number
    saves: number
  }>(
    `SELECT
      p.id, p.firstname, p.lastname, p.shortname, p.number, p.img, p.status, p.rank,
      p.defender, p.defensivemidfielder, p.offensivemidfielder, p.winger, p.striker, p.goalkeeper,
      COUNT(CASE WHEN pt.status::text IN ${ATTENDED_STATUSES} AND t.id IS NOT NULL THEN 1 END) AS sessions_attended,
      COUNT(t.id) AS total_sessions,
      p.birthdate::text AS birthdate, p.foot::text AS foot, p.gender,
      p.shirt_size, p.shorts_size, p.sock_size,
      COALESCE(ms.matches, 0)::int AS matches, COALESCE(ms.goals, 0)::int AS goals,
      COALESCE(ms.assists, 0)::int AS assists, COALESCE(ms.saves, 0)::int AS saves
    FROM players p
    -- Spelade matcher med mål, assist och räddningar under perioden
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS matches,
             SUM((SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.goal = p.id)) AS goals,
             SUM((SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.assist = p.id)) AS assists,
             SUM((SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.save = p.id)) AS saves
      FROM participantsmatches pm JOIN matches m ON m.id = pm.match
      WHERE pm.player = p.id AND ${PLAYED_MATCH} AND ${withinMonthsOf('m.date', '$1')}
    ) ms ON true
    LEFT JOIN participantstrainings pt ON pt.player = p.id
    LEFT JOIN trainings t ON t.id = pt.training
      AND ${PAST_TRAINING}
      AND ${withinMonths('$1')}
    WHERE EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id())
    GROUP BY p.id, ms.matches, ms.goals, ms.assists, ms.saves
    ORDER BY p.shortname`,
    [months]
  )
  return result.data
}
