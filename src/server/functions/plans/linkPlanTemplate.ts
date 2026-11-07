import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { cleanBlocks, withoutLeaders, writePlan } from '@/server/plans/shared'
import { ids } from '@/server/planning/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { id: number; trainingIds: number[] }

/** Lägger mallens block som plan på träningarna (ersätter deras plan) och kopplar dem till mallen. */
export default async function linkPlanTemplate(req: { params: Params; user: User }) {
  const id = Number(req.params.id)
  const { data } = await db.query<{ blocks: unknown }>(`SELECT blocks FROM plan_templates WHERE id = $1`, [id])
  if (!data[0]) throw new AccessError('Mallen finns inte längre.', 404)
  const blocks = withoutLeaders(cleanBlocks(data[0].blocks))
  const trainingIds = ids(req.params.trainingIds)
  if (!trainingIds.length) throw new AccessError('Välj minst en träning.', 400)

  const { data: found } = await db.query<{ id: number }>(`SELECT id FROM trainings WHERE id = ANY($1::int[])`, [trainingIds])
  for (const t of found) {
    await writePlan(t.id, blocks)
    await db.query(`UPDATE trainings SET plan_template_id = $2 WHERE id = $1`, [t.id, id])
  }
  return { linked: found.length }
}
