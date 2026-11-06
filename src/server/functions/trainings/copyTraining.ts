import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  newDate: string        // ISO datetime string e.g. "2024-06-22T18:00"
  includeParticipants: boolean
  svenskalag?: string | null
}

export default async function copyTraining(req: { params: Params; user: User }) {
  const { trainingId, newDate, includeParticipants, svenskalag } = req.params

  // Fetch original training
  const origRes = await db.query<{
    type: string
    indooroutdoor: string
    notes: string | null
    plan_template_id: number | null
  }>(
    `SELECT type, indooroutdoor, notes, plan_template_id FROM trainings WHERE id = $1`,
    [trainingId]
  )

  const orig = origRes.data[0]
  if (!orig) throw new Error(`Training ${trainingId} not found`)

  // Create new training
  const newRes = await db.query<{ id: number }>(
    `INSERT INTO trainings (type, date, date1, indooroutdoor, notes, svenskalag, reported, key, plan_template_id)
     VALUES ($1, $2::timestamptz, $3::date, $4, $5, $6, false, gen_random_uuid(), $7)
     RETURNING id`,
    [orig.type, newDate, newDate, orig.indooroutdoor, orig.notes ?? null, svenskalag ?? null, orig.plan_template_id ?? null]
  )

  const newId = newRes.data[0]?.id
  if (!newId) throw new Error('Failed to create training copy')

  if (includeParticipants) {
    // Copy participants with status reset to 'Kallad'
    await db.query(
      `INSERT INTO participantstrainings (training, player, leader, status, "group", grouprank)
       SELECT $1, player, leader, 'Kallad'::status_enum_88b832b7, "group", grouprank
       FROM participantstrainings
       WHERE training = $2`,
      [newId, trainingId]
    )
  }

  // Träningsplanen följer med
  const { data: blocks } = await db.query<{ id: number }>(
    `SELECT id FROM training_blocks WHERE training_id = $1 ORDER BY position, id`,
    [trainingId],
  )
  for (const b of blocks) {
    const { data: nb } = await db.query<{ id: number }>(
      `INSERT INTO training_blocks (training_id, position, name, minutes, notes)
       SELECT $1, position, name, minutes, notes FROM training_blocks WHERE id = $2 RETURNING id`,
      [newId, b.id],
    )
    await db.query(
      `INSERT INTO training_block_items (block_id, position, group_name, drill_id, title, level, notes)
       SELECT $1, position, group_name, drill_id, title, level, notes FROM training_block_items WHERE block_id = $2`,
      [nb[0].id, b.id],
    )
  }

  return { id: newId }
}
