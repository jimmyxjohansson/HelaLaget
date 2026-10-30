import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  playerIds: number[]
  status: string
}

export default async function addParticipants(req: { params: Params; user: User }) {
  const { trainingId, playerIds, status } = req.params

  if (!playerIds || playerIds.length === 0) {
    return { inserted: 0 }
  }

  // Single round-trip bulk insert using unnest over the player array.
  const result = await db.query<{ id: number }>(
    `INSERT INTO participantstrainings (training, player, status)
     SELECT $1, p, $2::status_enum_88b832b7
     FROM unnest($3::int[]) AS p
     RETURNING id`,
    [trainingId, status, playerIds]
  )

  return { inserted: result.data.length }
}
