import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { cleanText } from '@/server/drills/shared'
import { cleanBlocks, withoutLeaders, type PlanBlockInput } from '@/server/plans/shared'
import type { User } from '@/server/types'

type Params = { name: string; blocks: PlanBlockInput[] }

/** Spara en träningsplan som mall. Samma namn skriver över. */
export default async function savePlanTemplate(req: { params: Params; user: User }) {
  const name = cleanText(req.params.name, 80)
  if (!name) throw new AccessError('Mallen måste ha ett namn.', 400)
  const blocks = JSON.stringify(withoutLeaders(cleanBlocks(req.params.blocks)))
  const { data } = await db.query<{ id: number }>(
    `UPDATE plan_templates SET blocks = $2::jsonb WHERE lower(name) = lower($1) RETURNING id`,
    [name, blocks],
  )
  if (data[0]) return { id: data[0].id, replaced: true }
  const ins = await db.query<{ id: number }>(
    `INSERT INTO plan_templates (name, blocks) VALUES ($1, $2::jsonb) RETURNING id`,
    [name, blocks],
  )
  return { id: ins.data[0].id, replaced: false }
}
