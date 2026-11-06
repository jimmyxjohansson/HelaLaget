import { db } from '@/server/db'
import { UPCOMING_SQL, type PlanBlockInput } from '@/server/plans/shared'
import type { User } from '@/server/types'

type Params = Record<string, never>

/** Lagets sparade träningsplaner. */
export default async function getPlanTemplates(_req: { params: Params; user: User }) {
  const { data } = await db.query<{ id: number; name: string; blocks: PlanBlockInput[]; createdAt: string; linked: number; upcomingLinked: number }>(
    `SELECT pt.id, pt.name, pt.blocks, pt.created_at AS "createdAt",
            (SELECT COUNT(*)::int FROM trainings t WHERE t.plan_template_id = pt.id) AS linked,
            (SELECT COUNT(*)::int FROM trainings t WHERE t.plan_template_id = pt.id AND ${UPCOMING_SQL}) AS "upcomingLinked"
     FROM plan_templates pt ORDER BY pt.name`,
  )
  return data
}
