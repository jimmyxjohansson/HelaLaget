import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; id: number; participantId: number; on: boolean }

/**
 * Markera en kallad spelare som föreslagen målvakt (positionen "Målvakt" på
 * kallelsen). Flera kan vara föreslagna; vem som står i mål väljs i tidslinjen.
 */
export default async function setPlanningGoalkeeper(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const { data } = await db.query(
    `UPDATE ${k.participants}
     SET position = CASE WHEN $1::boolean THEN 'Målvakt'
                         WHEN position = 'Målvakt' THEN NULL ELSE position END
     WHERE id = $2 AND ${k.fk} = $3 AND leader IS NULL
     RETURNING id`,
    [!!req.params.on, Number(req.params.participantId), Number(req.params.id)],
  )
  if (data.length === 0) throw new AccessError('Spelaren hittades inte.', 404)
  return { success: true }
}
