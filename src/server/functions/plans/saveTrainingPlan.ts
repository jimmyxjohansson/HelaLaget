import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { cleanBlocks, writePlan, type PlanBlockInput } from '@/server/plans/shared'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  blocks: PlanBlockInput[]
  /**
   * Mallen planen kommer från. Utelämnad: kopplingen behålls. null: kopplingen tas bort.
   * En tom plan tar alltid bort kopplingen.
   */
  templateId?: number | null
}

/** Spara hela planen (ersätter den tidigare). */
export default async function saveTrainingPlan(req: { params: Params; user: User }) {
  const { trainingId } = req.params
  const blocks = cleanBlocks(req.params.blocks)
  const { data: t } = await db.query(`SELECT id FROM trainings WHERE id = $1`, [trainingId])
  if (!t[0]) throw new AccessError('Träningen finns inte.', 404)

  await writePlan(trainingId, blocks)
  if (blocks.length === 0 || req.params.templateId !== undefined) {
    const tid = blocks.length && req.params.templateId ? Number(req.params.templateId) : null
    await db.query(
      `UPDATE trainings SET plan_template_id = (SELECT id FROM plan_templates WHERE id = $2) WHERE id = $1`,
      [trainingId, tid],
    )
  }
  return { ok: true }
}
