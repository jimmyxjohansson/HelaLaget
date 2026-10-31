import { db } from '@/server/db'
import { ids, KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; id: number; participantIds: number[] }

/** Ta bort kallade spelare eller ledare från matchen/cupen. */
export default async function removePlanningParticipants(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const participantIds = ids(req.params.participantIds)
  if (participantIds.length === 0) return { removed: 0 }
  const { data } = await db.query<{ id: number }>(
    `DELETE FROM ${k.participants} WHERE ${k.fk} = $1 AND id = ANY($2::int[]) RETURNING id`,
    [Number(req.params.id), participantIds],
  )
  return { removed: data.length }
}
