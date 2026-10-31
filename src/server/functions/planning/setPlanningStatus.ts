import { db } from '@/server/db'
import { ids, KIND, kindOf, participantStatus } from '@/server/planning/shared'
import type { User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; id: number; participantIds: number[]; status: string }

/** Sätt svar (Förslag, Inbjuden, Kommer …) för markerade spelare. */
export default async function setPlanningStatus(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const status = participantStatus(req.params.status)
  const participantIds = ids(req.params.participantIds)
  if (participantIds.length === 0) return { updated: 0 }
  const { data } = await db.query<{ id: number }>(
    `UPDATE ${k.participants} SET status = $1::${k.statusType}
     WHERE ${k.fk} = $2 AND id = ANY($3::int[]) AND leader IS NULL
     RETURNING id`,
    [status, Number(req.params.id), participantIds],
  )
  return { updated: data.length }
}
