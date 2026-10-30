import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  match: number
  playerIds: number[]
  status: string
}

export default async function updateParticipantsStatus(req: { params: Params; user: User }) {
  const { match, playerIds, status } = req.params

  if (!playerIds || playerIds.length === 0) {
    return { updated: 0 }
  }

  const result = await db.query(
    `UPDATE participantsmatches
     SET status = $1::status_enum_499f7eb6
     WHERE match = $2 AND player = ANY($3::int[]) AND leader IS NULL`,
    [status, match, playerIds]
  )

  return { updated: result.data }
}
