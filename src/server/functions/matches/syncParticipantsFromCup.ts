import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  match: number
}

export default async function syncParticipantsFromCup(req: { params: Params; user: User }) {
  const { match } = req.params

  // Look up the cup this match is connected to.
  const matchRow = await db.query<{ cup: number | null }>(
    `SELECT cup FROM matches WHERE id = $1`,
    [match]
  )
  const cup = matchRow.data[0]?.cup ?? null
  if (cup == null) {
    return { synced: false, reason: 'not_connected_to_cup', removed: 0, inserted: 0 }
  }

  // Remove all current match participants (non-leader rows).
  const removeResult = await db.query(
    `DELETE FROM participantsmatches WHERE match = $1 AND leader IS NULL`,
    [match]
  )

  // Copy players from the cup that have status "Kommer".
  const insertResult = await db.query<{ id: number }>(
    `INSERT INTO participantsmatches (match, player, status)
     SELECT $1, pc.player, 'Kommer'::status_enum_499f7eb6
     FROM participantscups pc
     WHERE pc.cup = $2 AND pc.leader IS NULL
       AND pc.status = 'Kommer'::status_enum_87ddba0d
       AND pc.player IS NOT NULL
     RETURNING id`,
    [match, cup]
  )

  return {
    synced: true,
    removed: removeResult.data,
    inserted: insertResult.data.length,
  }
}
