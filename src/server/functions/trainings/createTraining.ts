import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  type: string
  date: string      // ISO datetime string e.g. "2024-06-15T18:00"
  indooroutdoor: string
  notes?: string
  svenskalag?: string | null
}

export default async function createTraining(req: { params: Params; user: User }) {
  const { type, date, indooroutdoor, notes, svenskalag } = req.params

  const result = await db.query<{ id: number }>(
    `INSERT INTO trainings (type, date, date1, indooroutdoor, notes, svenskalag, reported, key)
     VALUES ($1, $2::timestamptz, $3::date, $4, $5, $6, false, gen_random_uuid())
     RETURNING id`,
    [type, date, date, indooroutdoor, notes ?? null, svenskalag ?? null]
  )

  return result.data[0] ?? null
}
