import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  cup: number
  playerIds: number[]
  status: string
}

export default async function updateCupParticipantsStatus(req: { params: Params; user: User }) {
  const { cup, playerIds, status } = req.params

  if (!playerIds || playerIds.length === 0) {
    return { updated: 0 }
  }

  const result = await db.query(
    `UPDATE participantscups
     SET status = $1::status_enum_87ddba0d
     WHERE cup = $2 AND player = ANY($3::int[]) AND leader IS NULL`,
    [status, cup, playerIds]
  )

  return { updated: result.data }
}
