import { db } from '@/server/db'
import { betweenDatesOf } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  from?: string | null
  to?: string | null
}

/** Alla mål, assist och räddningar av lagets spelare i perioden, en rad per händelse. */
export default async function getStatsEvents(req: { params: Params; user: User }) {
  const from = req.params.from || null
  const to = req.params.to || null
  const { data } = await db.query<{
    id: number
    match_id: number
    date: string
    matchtype: string | null
    level: string | null
    opponent: string | null
    cup_name: string | null
    minute: number | null
    type: string | null
    goal: number | null
    assist: number | null
    save: number | null
    ourgoal: number | null
    theirgoal: number | null
  }>(
    `SELECT e.id, m.id AS match_id, m.date, m.matchtype::text AS matchtype, NULLIF(m.difficulty::text, '') AS level,
            COALESCE(NULLIF(t.team, ''), NULLIF(m.teamname, '')) AS opponent, c.name AS cup_name,
            e.minute, NULLIF(e.type, '') AS type, e.goal, e.assist, e.save, e.ourgoal, e.theirgoal
     FROM matchgoalsassists e
     JOIN matches m ON m.id = e.match
     LEFT JOIN teams t ON t.id = m.vs
     LEFT JOIN cups c ON c.id = m.cup
     WHERE (e.goal IS NOT NULL OR e.assist IS NOT NULL OR e.save IS NOT NULL)
       AND ${betweenDatesOf('m.date', '$1', '$2')}
     ORDER BY m.date DESC, e.minute DESC NULLS LAST, e.id DESC`,
    [from, to],
  )
  return data
}
