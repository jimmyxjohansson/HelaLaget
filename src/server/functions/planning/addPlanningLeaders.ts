import { db } from '@/server/db'
import { ids, KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; id: number; leaderIds: number[] }

/** Lägg till ledare (svar Kommer). Bara lagets ledare, och inga dubbletter. */
export default async function addPlanningLeaders(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const leaderIds = ids(req.params.leaderIds)
  if (leaderIds.length === 0) return { added: 0 }
  const { data } = await db.query<{ id: number }>(
    `INSERT INTO ${k.participants} (${k.fk}, leader, status)
     SELECT $1, l, 'Kommer'::${k.statusType}
     FROM unnest($2::int[]) AS l
     WHERE EXISTS (SELECT 1 FROM squad_leaders sl WHERE sl.leader_id = l AND sl.squad_id = app.squad_id())
       AND NOT EXISTS (SELECT 1 FROM ${k.participants} x WHERE x.${k.fk} = $1 AND x.leader = l)
     RETURNING id`,
    [Number(req.params.id), leaderIds],
  )
  return { added: data.length }
}
