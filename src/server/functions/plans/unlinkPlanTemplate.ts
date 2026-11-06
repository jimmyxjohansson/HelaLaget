import { db } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { trainingId: number }

/** Tar bort kopplingen mellan en träning och dess mall. Planen ligger kvar. */
export default async function unlinkPlanTemplate(req: { params: Params; user: User }) {
  await db.query(`UPDATE trainings SET plan_template_id = NULL WHERE id = $1`, [Number(req.params.trainingId)])
  return { ok: true }
}
