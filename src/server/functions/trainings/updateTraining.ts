import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  type: string
  date: string
  indooroutdoor: string
  notes?: string
  svenskalag?: string | null
}

export default async function updateTraining(req: { params: Params; user: User }) {
  const { id, type, date, indooroutdoor, notes, svenskalag } = req.params

  await db.query(
    `UPDATE trainings SET
      type = $1,
      date = $2,
      date1 = $3::date,
      indooroutdoor = $4,
      notes = $5,
      svenskalag = $6
     WHERE id = $7`,
    [type, date, date, indooroutdoor, notes ?? null, svenskalag ?? null, id]
  )

  return { success: true }
}
