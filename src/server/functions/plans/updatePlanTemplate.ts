import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { cleanText } from '@/server/drills/shared'
import { cleanBlocks, UPCOMING_SQL, writePlan, type PlanBlockInput } from '@/server/plans/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = {
  id?: number | null
  name: string
  blocks: PlanBlockInput[]
  /** Skriv också om planen på kommande träningar som är kopplade till mallen */
  updateLinked?: boolean
}

/**
 * Skapa en ny mall (utan id) eller ändra en befintlig: namn och block.
 * Två mallar i laget kan inte heta likadant.
 */
export default async function updatePlanTemplate(req: { params: Params; user: User }) {
  const name = cleanText(req.params.name, 80)
  if (!name) throw new AccessError('Mallen måste ha ett namn.', 400)
  const id = req.params.id ? Number(req.params.id) : null
  const cleaned = cleanBlocks(req.params.blocks)
  const blocks = JSON.stringify(cleaned)

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
    let updated = 0
    if (req.params.updateLinked) {
      const { data: linked } = await db.query<{ id: number }>(
        `SELECT t.id FROM trainings t WHERE t.plan_template_id = $1 AND ${UPCOMING_SQL}`,
        [id],
      )
      for (const t of linked) await writePlan(t.id, cleaned)
      updated = linked.length
    }
    return { id: data[0].id, updated }
  }
  const ins = await db.query<{ id: number }>(
    `INSERT INTO plan_templates (name, blocks) VALUES ($1, $2::jsonb) RETURNING id`,
    [name, blocks],
  )
  return { id: ins.data[0].id, updated: 0 }
}
