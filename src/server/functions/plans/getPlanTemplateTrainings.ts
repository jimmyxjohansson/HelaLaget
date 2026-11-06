import { db } from '@/server/db'
import { UPCOMING_SQL } from '@/server/plans/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { id: number }

export type TemplateTraining = {
  id: number
  date: string
  type: string | null
  /** Antal block i träningens plan */
  blocks: number
  /** Mallen träningens plan kommer från, om någon */
  templateId: number | null
  templateName: string | null
  upcoming: boolean
}

/**
 * Träningar för en mall: de som är kopplade till den (alla, senaste först)
 * och träningar som går att koppla: kommande (närmast först, 60 dagar fram)
 * och tidigare (senaste först, 90 dagar bakåt).
 */
export default async function getPlanTemplateTrainings(req: { params: Params; user: User }) {
  const id = Number(req.params.id)
  const cols = `t.id, t.date, t.type::text AS type,
    (SELECT COUNT(*)::int FROM training_blocks b WHERE b.training_id = t.id) AS blocks,
    t.plan_template_id AS "templateId", pt.name AS "templateName",
    (${UPCOMING_SQL}) AS upcoming`
  const [linked, upcoming, past] = await Promise.all([
    db.query<TemplateTraining>(
      `SELECT ${cols} FROM trainings t LEFT JOIN plan_templates pt ON pt.id = t.plan_template_id
       WHERE t.plan_template_id = $1 ORDER BY t.date DESC`,
      [id],
    ),
    db.query<TemplateTraining>(
      `SELECT ${cols} FROM trainings t LEFT JOIN plan_templates pt ON pt.id = t.plan_template_id
       WHERE ${UPCOMING_SQL} AND t.date < now() + interval '60 days'
       ORDER BY t.date`,
    ),
    db.query<TemplateTraining>(
      `SELECT ${cols} FROM trainings t LEFT JOIN plan_templates pt ON pt.id = t.plan_template_id
       WHERE NOT (${UPCOMING_SQL}) AND t.date >= now() - interval '90 days'
       ORDER BY t.date DESC`,
    ),
  ])
  return { linked: linked.data, upcoming: upcoming.data, past: past.data }
}
