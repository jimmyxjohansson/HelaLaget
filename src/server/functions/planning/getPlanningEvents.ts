import { db } from '@/server/db'
import { kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = {
  kind: 'match' | 'cup'
  /** Matchtyper att visa (Serie, Träning, Cup). Tom = alla. */
  matchTypes?: string[]
  /** Även avslutade */
  includeFinished?: boolean
}

export type PlanningEvent = {
  id: number
  title: string
  imgurl: string | null
  date: string | null
  enddate: string | null
  difficulty: string | null
  matchtype: string | null
  matchplayers: string | null
  status: string | null
  proposed: number
  invited: number
  coming: number
  declined: number
}

const COUNTS = (pa: string) => `
  COUNT(*) FILTER (WHERE ${pa}.status::text = 'Förslag' AND ${pa}.leader IS NULL)::int AS proposed,
  COUNT(*) FILTER (WHERE ${pa}.status::text = 'Inbjuden' AND ${pa}.leader IS NULL)::int AS invited,
  COUNT(*) FILTER (WHERE ${pa}.status::text = 'Kommer' AND ${pa}.leader IS NULL)::int AS coming,
  COUNT(*) FILTER (WHERE ${pa}.status::text IN ('Nekat', 'Ej svarat') AND ${pa}.leader IS NULL)::int AS declined`

/** Matcher eller cuper att välja i planeringens kolumner, med antal per svar. */
export default async function getPlanningEvents(req: { params: Params; user: User }): Promise<PlanningEvent[]> {
  const kind = kindOf(req.params.kind)
  const all = !!req.params.includeFinished
  if (kind === 'match') {
    const types = (req.params.matchTypes ?? []).filter((t) => typeof t === 'string')
    const { data } = await db.query<PlanningEvent>(
      `SELECT m.id, COALESCE(NULLIF(t.team, ''), m.teamname, 'Okänd motståndare') AS title, t.imgurl,
              m.date, NULL::timestamptz AS enddate, m.difficulty::text AS difficulty, m.matchtype::text AS matchtype,
              m.matchplayers::text AS matchplayers, m.status::text AS status, ${COUNTS('pm')}
       FROM matches m
       LEFT JOIN teams t ON t.id = m.vs
       LEFT JOIN participantsmatches pm ON pm.match = m.id
       WHERE (cardinality($1::text[]) = 0 OR m.matchtype::text = ANY($1::text[]))
         AND ($2::boolean OR m.status IS NULL OR m.status::text <> 'Avslutad')
       GROUP BY m.id, t.team, t.imgurl
       ORDER BY ${all ? 'm.date DESC' : 'm.date ASC'}, m.difficulty`,
      [types, all],
    )
    return data
  }
  const { data } = await db.query<PlanningEvent>(
    `SELECT c.id, c.name AS title, NULL AS imgurl, c.startdate AS date, c.enddate,
            c.difficulty::text AS difficulty, NULL AS matchtype, NULL AS matchplayers, c.status::text AS status,
            ${COUNTS('pc')}
     FROM cups c
     LEFT JOIN participantscups pc ON pc.cup = c.id
     WHERE ($1::boolean OR c.status IS NULL OR c.status::text <> 'Avslutad')
     GROUP BY c.id
     ORDER BY ${all ? 'c.startdate DESC' : 'c.startdate ASC'}, c.difficulty, c.name`,
    [all],
  )
  return data
}
