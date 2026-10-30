import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  playerIds: number[]
}

export default async function removeParticipant(req: { params: Params; user: User }) {
  const { trainingId, playerIds } = req.params

  if (!playerIds.length) return { deleted: 0 }

  const result = await db.query(
    `DELETE FROM participantstrainings
     WHERE training = $1
       AND player = ANY($2::int[])`,
    [trainingId, playerIds]
  )

  return { deleted: result.data }
}
