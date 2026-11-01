import { db } from '@/server/db'
import { notifyGoalRemoved } from '@/server/notifications/match'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  id: number
  matchId: number
}

export default async function deleteMatchEvent(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { id, matchId } = req.params

  const { data: removed } = await db.query<{ id: number; minute: number | null; save: number | null }>(
    `DELETE FROM matchgoalsassists WHERE id = $1 AND match = $2 RETURNING id, minute, save`,
    [id, matchId],
  )

  // Recompute running scores for the remaining events in this match.
  // Same rules as saveMatchEvent: an own goal (type = 'Självmål') has no scorer but counts for us.
  await db.query(
    `WITH ordered AS (
       SELECT id,
              SUM(CASE WHEN goal IS NOT NULL OR type::text = 'Självmål' THEN 1 ELSE 0 END)
                OVER (ORDER BY COALESCE(period, 1), minute NULLS LAST, id) AS our_running,
              SUM(CASE WHEN goal IS NULL AND save IS NULL AND (type IS NULL OR type::text <> 'Självmål') THEN 1 ELSE 0 END)
                OVER (ORDER BY COALESCE(period, 1), minute NULLS LAST, id) AS their_running
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
        SET ourgoals = COALESCE((SELECT COUNT(*) FROM matchgoalsassists WHERE match = $1 AND (goal IS NOT NULL OR type::text = 'Självmål')), 0),
            theirgoals = COALESCE((SELECT COUNT(*) FROM matchgoalsassists WHERE match = $2 AND goal IS NULL AND save IS NULL AND (type IS NULL OR type::text <> 'Självmål')), 0)
      WHERE id = $3`,
    [matchId, matchId, matchId],
  )

  // Har det skickats en notis om målet går en rättelse ut med ny ställning.
  const event = removed[0]
  if (event && event.save == null && req.squad) {
    notifyGoalRemoved({ squadId: req.squad.squadId, matchId, userId: req.user.id, eventId: event.id, minute: event.minute })
  }

  return { success: true }
}
