import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { cleanBlocks, type PlanBlockInput } from '@/server/plans/shared'
import type { User } from '@/server/types'

type Params = { trainingId: number; blocks: PlanBlockInput[] }

/** Spara hela planen (ersätter den tidigare). */
export default async function saveTrainingPlan(req: { params: Params; user: User }) {
  const { trainingId } = req.params
  const blocks = cleanBlocks(req.params.blocks)
  const { data: t } = await db.query(`SELECT id FROM trainings WHERE id = $1`, [trainingId])
  if (!t[0]) throw new AccessError('Träningen finns inte.', 404)

  await db.query(`DELETE FROM training_blocks WHERE training_id = $1`, [trainingId])
  for (const [bi, b] of blocks.entries()) {
    const { data } = await db.query<{ id: number }>(
      `INSERT INTO training_blocks (training_id, position, name, minutes, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [trainingId, bi, b.name, b.minutes, b.notes],
    )
    const blockId = data[0].id
    for (const [ii, i] of b.items.entries()) {
      if (!i.drillId && !i.title && !i.notes) continue
      await db.query(
        `INSERT INTO training_block_items (block_id, position, group_name, drill_id, title, level, notes)
         SELECT $1, $2, $3, d.id, $5, $6, $7
         FROM (SELECT $4::int AS want) w LEFT JOIN drills d ON d.id = w.want`,
        [blockId, ii, i.groupName, i.drillId, i.title, i.level, i.notes],
      )
    }
  }
  return { ok: true }
}
