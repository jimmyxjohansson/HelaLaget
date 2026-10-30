import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  cup: number
  playerIds: number[]
  status: string
}

export default async function addCupParticipants(req: { params: Params; user: User }) {
  const { cup, playerIds, status } = req.params

  if (!playerIds || playerIds.length === 0) {
    return { inserted: 0 }
  }

  // Insert only players not already participating in this cup (non-leader rows).
  const result = await db.query<{ id: number }>(
    `INSERT INTO participantscups (cup, player, status)
     SELECT $1, p, $2::status_enum_87ddba0d
     FROM unnest($3::int[]) AS p
     WHERE NOT EXISTS (
       SELECT 1 FROM participantscups pc
       WHERE pc.cup = $1 AND pc.player = p AND pc.leader IS NULL
     )
     RETURNING id`,
    [cup, status, playerIds]
  )

  return { inserted: result.data.length }
}
