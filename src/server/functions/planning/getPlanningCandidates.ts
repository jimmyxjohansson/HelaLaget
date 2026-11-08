import { db } from '@/server/db'
import { attendanceLateral, fromDate, ids, KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = {
  kind: 'match' | 'cup'
  /** Matcher/cuper i kolumnerna: spelare som redan är kallade till någon av dem visas inte */
  eventIds: number[]
  /** Träningsnärvaro och matcher räknas från detta datum, null = alla */
  from?: string | null
  /** Spelarstatus att visa. Tom = alla. */
  playerStatuses?: string[]
}

export type Candidate = {
  id: number
  shortname: string | null
  number: number | null
  rank: string | null
  gender: string | null
  backbone: string | null
  status: string | null
  /** Har positionen Målvakt på spelarkortet */
  canGoalkeeper: boolean
  coming: number
  total: number
  /** Dagar sedan senaste spelade matchen (svar Kommer), null om ingen */
  lastmatch: number | null
  /** Matcher (alla typer, även cupmatcher) med svar Kommer under perioden */
  matches: number
  /** Cuper med svar Kommer under perioden */
  cups: number
}

/** Lagets spelare som inte är kallade till någon av de valda matcherna/cuperna. */
export default async function getPlanningCandidates(req: { params: Params; user: User }): Promise<Candidate[]> {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const eventIds = ids(req.params.eventIds)
  const from = fromDate(req.params.from)
  const statuses = (req.params.playerStatuses ?? []).filter((s) => typeof s === 'string')

  const { data } = await db.query<Candidate>(
    `SELECT p.id, p.shortname, p.number, p.rank::text AS rank, p.gender, p.backbone::text AS backbone, p.status::text AS status,
            COALESCE(p.goalkeeper, false) AS "canGoalkeeper",
            COALESCE(a.coming, 0) AS coming, COALESCE(a.total, 0) AS total,
            ((now() AT TIME ZONE 'Europe/Stockholm')::date - lm.last::date) AS lastmatch,
            COALESCE(lm.matches, 0)::int AS matches,
            COALESCE(lc.cups, 0)::int AS cups
     FROM players p
     JOIN squad_players sp ON sp.player_id = p.id AND sp.squad_id = app.squad_id()
     ${attendanceLateral('$2')}
     LEFT JOIN LATERAL (
       SELECT MAX(m.date AT TIME ZONE 'UTC') FILTER (
                WHERE m.date < (((now() AT TIME ZONE 'Europe/Stockholm')::date + 1)::timestamp AT TIME ZONE 'UTC')) AS last,
              COUNT(*) FILTER (
                WHERE ($2::date IS NULL OR m.date >= ($2::date)::timestamp AT TIME ZONE 'UTC')
                  AND m.date < (((now() AT TIME ZONE 'Europe/Stockholm')::date + 1)::timestamp AT TIME ZONE 'UTC')) AS matches
       FROM participantsmatches pm
       JOIN matches m ON m.id = pm.match
       WHERE pm.player = p.id AND pm.status::text = 'Kommer'
     ) lm ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS cups
       FROM participantscups pc
       JOIN cups c ON c.id = pc.cup
       WHERE pc.player = p.id AND pc.status::text = 'Kommer'
         AND ($2::date IS NULL OR c.startdate >= ($2::date)::timestamp AT TIME ZONE 'UTC')
         AND c.startdate < (((now() AT TIME ZONE 'Europe/Stockholm')::date + 1)::timestamp AT TIME ZONE 'UTC')
     ) lc ON true
     WHERE (cardinality($3::text[]) = 0 OR p.status::text = ANY($3::text[]))
       AND NOT EXISTS (
         SELECT 1 FROM ${k.participants} x
         WHERE x.player = p.id AND x.${k.fk} = ANY($1::int[]) AND x.leader IS NULL)
     ORDER BY p.rank NULLS LAST, p.status, p.shortname`,
    [eventIds, from, statuses],
  )
  return data
}
