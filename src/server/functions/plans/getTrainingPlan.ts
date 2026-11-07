import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { trainingId: number }

/** Träningspassets plan: block i ordning, med övningarna (och deras ritningar) per grupp. */
export default async function getTrainingPlan(req: { params: Params; user: User }) {
  const { trainingId } = req.params
  const [blocks, items] = await Promise.all([
    db.query<{ id: number; position: number; name: string; minutes: number | null; notes: string | null }>(
      `SELECT id, position, name, minutes, notes FROM training_blocks WHERE training_id = $1 ORDER BY position, id`,
      [trainingId],
    ),
    db.query<{
      id: number
      blockId: number
      position: number
      groupName: string | null
      drillId: number | null
      title: string | null
      level: string | null
      notes: string | null
      leaderIds: number[]
      otherAdult: string | null
      drillName: string | null
      summary: string | null
      coaching: string | null
      description: string | null
      durationMinutes: number | null
      area: string | null
      equipment: string | null
      intensity: string | null
      diagram: unknown | null
      levels: Record<string, { text?: string | null; diagram?: unknown | null }> | null
    }>(
      `SELECT i.id, i.block_id AS "blockId", i.position, i.group_name AS "groupName", i.drill_id AS "drillId",
              i.title, i.level, i.notes, i.leader_ids AS "leaderIds", i.other_adult AS "otherAdult", d.name AS "drillName", d.summary, d.coaching, d.description,
              d.duration_minutes AS "durationMinutes", d.area, d.equipment, d.intensity, d.diagram, d.levels
       FROM training_block_items i
       JOIN training_blocks b ON b.id = i.block_id
       LEFT JOIN drills d ON d.id = i.drill_id
       WHERE b.training_id = $1
       ORDER BY i.position, i.id`,
      [trainingId],
    ),
  ])
  return blocks.data.map((b) => ({ ...b, items: items.data.filter((i) => i.blockId === b.id) }))
}
