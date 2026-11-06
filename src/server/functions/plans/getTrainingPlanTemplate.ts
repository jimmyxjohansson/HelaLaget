import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { trainingId: number }

/** Mallen som träningens plan kommer från, om någon. */
export default async function getTrainingPlanTemplate(req: { params: Params; user: User }) {
  const { data } = await db.query<{ id: number; name: string }>(
    `SELECT pt.id, pt.name FROM trainings t JOIN plan_templates pt ON pt.id = t.plan_template_id WHERE t.id = $1`,
    [Number(req.params.trainingId)],
  )
  return data[0] ?? null
}
