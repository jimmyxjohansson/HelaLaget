import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { cleanText } from '@/server/drills/shared'
import { cleanBlocks, type PlanBlockInput } from '@/server/plans/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { id?: number | null; name: string; blocks: PlanBlockInput[] }

/**
 * Skapa en ny mall (utan id) eller ändra en befintlig: namn och block.
 * Två mallar i laget kan inte heta likadant.
 */
export default async function updatePlanTemplate(req: { params: Params; user: User }) {
  const name = cleanText(req.params.name, 80)
  if (!name) throw new AccessError('Mallen måste ha ett namn.', 400)
  const id = req.params.id ? Number(req.params.id) : null
  const blocks = JSON.stringify(cleanBlocks(req.params.blocks))

  const clash = await db.query<{ id: number }>(
    `SELECT id FROM plan_templates WHERE lower(name) = lower($1) AND ($2::int IS NULL OR id <> $2)`,
    [name, id],
  )
  if (clash.data[0]) throw new AccessError(`Det finns redan en mall som heter ”${name}”.`, 400)

  if (id) {
    const { data } = await db.query<{ id: number }>(
      `UPDATE plan_templates SET name = $2, blocks = $3::jsonb WHERE id = $1 RETURNING id`,
      [id, name, blocks],
    )
    if (!data[0]) throw new AccessError('Mallen finns inte längre.', 404)
    return { id: data[0].id }
  }
  const ins = await db.query<{ id: number }>(
    `INSERT INTO plan_templates (name, blocks) VALUES ($1, $2::jsonb) RETURNING id`,
    [name, blocks],
  )
  return { id: ins.data[0].id }
}
