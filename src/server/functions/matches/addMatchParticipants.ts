import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  match: number
  playerIds: number[]
  status: string
}

export default async function addMatchParticipants(req: { params: Params; user: User }) {
  const { match, playerIds, status } = req.params

  if (!playerIds || playerIds.length === 0) {
    return { inserted: 0 }
  }

  // Insert only players not already participating in this match (non-leader rows).
  // Note: the Retool DB driver counts placeholder OCCURRENCES, not distinct $N, so a reused
  // placeholder must get its own number and value — hence `match` uses $1 and $4 (supplied twice).
  const result = await db.query<{ id: number }>(
    `INSERT INTO participantsmatches (match, player, status)
     SELECT $1, p, $2::status_enum_499f7eb6
     FROM unnest($3::int[]) AS p
     WHERE NOT EXISTS (
       SELECT 1 FROM participantsmatches pm
       WHERE pm.match = $4 AND pm.player = p AND pm.leader IS NULL
     )
     RETURNING id`,
    [match, status, playerIds, match]
  )

  return { inserted: result.data.length }
}
