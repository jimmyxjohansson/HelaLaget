import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { ids, KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; fromId: number; toId: number; participantIds: number[] }

/**
 * Flytta markerade spelare till en annan match/cup, med sitt svar. Spelare
 * som redan är kallade dit stannar kvar.
 */
export default async function movePlanningParticipants(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const fromId = Number(req.params.fromId)
  const toId = Number(req.params.toId)
  const participantIds = ids(req.params.participantIds)
  if (!toId || toId === fromId) throw new AccessError('Välj en annan match att flytta till.', 400)
  if (participantIds.length === 0) return { moved: 0, skipped: 0 }

  const { data: target } = await db.query(`SELECT 1 FROM ${k.events} WHERE id = $1`, [toId])
  if (target.length === 0) throw new AccessError('Matchen att flytta till hittades inte.', 404)

  const { data } = await db.query<{ id: number }>(
    `UPDATE ${k.participants} x SET ${k.fk} = $2
     WHERE x.${k.fk} = $1 AND x.id = ANY($3::int[]) AND x.leader IS NULL
       AND NOT EXISTS (SELECT 1 FROM ${k.participants} y WHERE y.${k.fk} = $2 AND y.player = x.player AND y.leader IS NULL)
     RETURNING x.id`,
    [fromId, toId, participantIds],
  )
  return { moved: data.length, skipped: participantIds.length - data.length }
}
