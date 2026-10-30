import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  /** When set, updates the existing event row. */
  id?: number
  matchId: number
  /** 'our_goal' = we scored, 'their_goal' = opponent scored, 'save' = goalkeeper save */
  kind: 'our_goal' | 'their_goal' | 'save'
  minute: number | null
  goalPlayer?: number | null
  assistPlayer?: number | null
  savePlayer?: number | null
  /** Goal type: 'Spelmål' | 'Hörna' | 'Frispark' | 'Straff'. Only applies to goal events. */
  type?: string | null
}

export default async function saveMatchEvent(req: { params: Params; user: User }) {
  const p = req.params

  const goal = p.kind === 'our_goal' ? (p.goalPlayer ?? null) : null
  const assist = p.kind === 'our_goal' ? (p.assistPlayer ?? null) : null
  const save = p.kind === 'save' ? (p.savePlayer ?? null) : null
  // type only meaningful for goal events; saves are always null.
  let type = p.kind === 'save' ? null : (p.type ?? 'Spelmål')
  // Both our own goal and the opponent's own goal arrive as 'Självmål' with no scorer.
  // Mark the opponent's so scoring/classification can tell them apart.
  if (p.kind === 'their_goal' && type === 'Självmål') type = 'Självmål (motst.)'

  if (p.id) {
    await db.query(
      `UPDATE matchgoalsassists
         SET goal = $1, assist = $2, save = $3, minute = $4, type = $5
       WHERE id = $6 AND match = $7`,
      [goal, assist, save, p.minute, type, p.id, p.matchId],
    )
  } else {
    await db.query(
      `INSERT INTO matchgoalsassists (match, goal, assist, save, minute, type, ourgoal, theirgoal)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0)`,
      [p.matchId, goal, assist, save, p.minute, type],
    )
  }

  // Recompute running ourgoal / theirgoal for every event in this match.
  // An own goal (type = 'Självmål') has no scorer but counts for us.
  await db.query(
    `WITH ordered AS (
       SELECT id,
              SUM(CASE WHEN goal IS NOT NULL OR type::text = 'Självmål' THEN 1 ELSE 0 END)
                OVER (ORDER BY minute NULLS LAST, id) AS our_running,
              SUM(CASE WHEN goal IS NULL AND save IS NULL AND (type IS NULL OR type::text <> 'Självmål') THEN 1 ELSE 0 END)
                OVER (ORDER BY minute NULLS LAST, id) AS their_running
       FROM matchgoalsassists
       WHERE match = $1
     )
     UPDATE matchgoalsassists m
        SET ourgoal = o.our_running,
            theirgoal = o.their_running
       FROM ordered o
      WHERE m.id = o.id`,
    [p.matchId],
  )

  // Sync the match totals to the running totals so the scoreboard matches.
  await db.query(
    `UPDATE matches
        SET ourgoals = COALESCE((SELECT COUNT(*) FROM matchgoalsassists WHERE match = $1 AND (goal IS NOT NULL OR type::text = 'Självmål')), 0),
            theirgoals = COALESCE((SELECT COUNT(*) FROM matchgoalsassists WHERE match = $2 AND goal IS NULL AND save IS NULL AND (type IS NULL OR type::text <> 'Självmål')), 0)
      WHERE id = $3`,
    [p.matchId, p.matchId, p.matchId],
  )

  return { success: true }
}
