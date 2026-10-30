import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  match: number
  playerIds: number[]
}

export default async function removeParticipants(req: { params: Params; user: User }) {
  const { match, playerIds } = req.params

  if (!playerIds || playerIds.length === 0) {
    return { removed: 0 }
  }

  const result = await db.query(
    `DELETE FROM participantsmatches
     WHERE match = $1 AND player = ANY($2::int[]) AND leader IS NULL`,
    [match, playerIds]
  )

  return { removed: result.data }
}
