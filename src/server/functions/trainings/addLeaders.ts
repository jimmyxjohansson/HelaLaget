import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  leaderIds: number[]
  status: string
}

export default async function addLeaders(req: { params: Params; user: User }) {
  const { trainingId, leaderIds, status } = req.params

  if (!leaderIds || leaderIds.length === 0) {
    return { inserted: 0 }
  }

  // Single round-trip bulk insert using unnest over the leader array.
  const result = await db.query<{ id: number }>(
    `INSERT INTO participantstrainings (training, leader, status)
     SELECT $1, l, $2::status_enum_88b832b7
     FROM unnest($3::int[]) AS l
     RETURNING id`,
    [trainingId, status, leaderIds]
  )

  return { inserted: result.data.length }
}
