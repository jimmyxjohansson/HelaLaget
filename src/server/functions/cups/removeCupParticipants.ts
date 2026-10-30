import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  cup: number
  playerIds: number[]
}

export default async function removeCupParticipants(req: { params: Params; user: User }) {
  const { cup, playerIds } = req.params

  if (!playerIds || playerIds.length === 0) {
    return { removed: 0 }
  }

  const result = await db.query(
    `DELETE FROM participantscups
     WHERE cup = $1 AND player = ANY($2::int[]) AND leader IS NULL`,
    [cup, playerIds]
  )

  return { removed: result.data }
}
