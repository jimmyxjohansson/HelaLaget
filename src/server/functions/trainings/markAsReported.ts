import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  reported: boolean
}

export default async function markAsReported(req: { params: Params; user: User }) {
  const { trainingId, reported } = req.params

  await db.query(
    `UPDATE trainings SET reported = $1 WHERE id = $2`,
    [reported, trainingId]
  )

  return { success: true, reported }
}
