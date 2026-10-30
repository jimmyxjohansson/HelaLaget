import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  leaderIds: number[]
  status: string
}

export default async function updateLeaderStatus(req: { params: Params; user: User }) {
  const { trainingId, leaderIds, status } = req.params

  if (!leaderIds.length) return { updated: 0 }

  const result = await db.query(
    `UPDATE participantstrainings
     SET status = $1::status_enum_88b832b7
     WHERE training = $2
       AND leader = ANY($3::int[])`,
    [status, trainingId, leaderIds]
  )

  return { updated: result.data }
}
