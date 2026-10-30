import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  matchId: number
}

export default async function deleteMatchEvent(req: { params: Params; user: User }) {
  const { id, matchId } = req.params

  await db.query(
    `DELETE FROM matchgoalsassists WHERE id = $1 AND match = $2`,
    [id, matchId],
  )

  // Recompute running scores for the remaining events in this match.
  await db.query(
    `WITH ordered AS (
       SELECT id,
              SUM(CASE WHEN goal IS NOT NULL THEN 1 ELSE 0 END)
                OVER (ORDER BY minute NULLS LAST, id) AS our_running,
              SUM(CASE WHEN goal IS NULL AND save IS NULL THEN 1 ELSE 0 END)
                OVER (ORDER BY minute NULLS LAST, id) AS their_running
       FROM matchgoalsassists
       WHERE match = $1
     )
     UPDATE matchgoalsassists m
        SET ourgoal = o.our_running,
            theirgoal = o.their_running
       FROM ordered o
      WHERE m.id = o.id`,
    [matchId],
  )

  await db.query(
    `UPDATE matches
        SET ourgoals = COALESCE((SELECT COUNT(*) FROM matchgoalsassists WHERE match = $1 AND goal IS NOT NULL), 0),
            theirgoals = COALESCE((SELECT COUNT(*) FROM matchgoalsassists WHERE match = $2 AND goal IS NULL AND save IS NULL), 0)
      WHERE id = $3`,
    [matchId, matchId, matchId],
  )

  return { success: true }
}
