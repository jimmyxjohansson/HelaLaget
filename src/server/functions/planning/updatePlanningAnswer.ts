import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { KIND, kindOf, participantStatus } from '@/server/planning/shared'
import type { User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; id: number; participantId: number; status: string; reason?: string | null }

/** Ändra en spelares svar och anledning. */
export default async function updatePlanningAnswer(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const status = participantStatus(req.params.status)
  const reason = req.params.reason?.trim() || null
  const { data } = await db.query(
    `UPDATE ${k.participants} SET status = $1::${k.statusType}, reason = $2
     WHERE id = $3 AND ${k.fk} = $4 AND leader IS NULL RETURNING id`,
    [status, reason, Number(req.params.participantId), Number(req.params.id)],
  )
  if (data.length === 0) throw new AccessError('Svaret hittades inte.', 404)
  return { success: true }
}
