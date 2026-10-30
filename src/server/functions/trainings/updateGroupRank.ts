import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  group: string
  rank: string | null
}

export default async function updateGroupRank(req: { params: Params; user: User }) {
  const { trainingId, group, rank } = req.params

  const result = await db.query(
    `UPDATE participantstrainings
     SET grouprank = $1
     WHERE training = $2
       AND "group" = $3`,
    [rank, trainingId, group]
  )

  return { updated: result.data }
}
