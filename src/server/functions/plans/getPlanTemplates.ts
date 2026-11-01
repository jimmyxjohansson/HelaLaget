import { db } from '@/server/db'
import type { PlanBlockInput } from '@/server/plans/shared'
import type { User } from '@/server/types'

type Params = Record<string, never>

/** Lagets sparade träningsplaner. */
export default async function getPlanTemplates(_req: { params: Params; user: User }) {
  const { data } = await db.query<{ id: number; name: string; blocks: PlanBlockInput[]; createdAt: string }>(
    `SELECT id, name, blocks, created_at AS "createdAt" FROM plan_templates ORDER BY name`,
  )
  return data
}
