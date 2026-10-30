import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  leaderIds: number[]
}

export default async function removeLeader(req: { params: Params; user: User }) {
  const { trainingId, leaderIds } = req.params

  if (!leaderIds.length) return { deleted: 0 }

  const result = await db.query(
    `DELETE FROM participantstrainings
     WHERE training = $1
       AND leader = ANY($2::int[])`,
    [trainingId, leaderIds]
  )

  return { deleted: result.data }
}
