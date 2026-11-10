import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { ALL_CRITERIA, GRADES, suggestLevel, type Grade } from '@/utils/levelMatrix'
import type { User } from '@/server/types'

export const access = 'leader'

const RANKS = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D']

type Params = {
  playerId: number
  scores: Record<string, string>
  /** Sätt spelarens nivå, t.ex. den föreslagna */
  applyRank?: string | null
  comment?: string | null
}

/** Sparar en bedömning och sätter (om valt) spelarens nivå. */
export default async function saveLevelAssessment(req: { params: Params; user: User }) {
  const p = req.params
  const scores: Record<string, Grade> = {}
  for (const c of ALL_CRITERIA) {
    const g = p.scores?.[c.key]
    if (g && (GRADES as string[]).includes(g)) scores[c.key] = g as Grade
  }
  const suggested = suggestLevel(scores)
  if (!suggested) throw new AccessError('Fyll i fotbollsaktioner och fysik för att få en nivå.', 400)
  const apply = p.applyRank ? String(p.applyRank).toUpperCase() : null
  if (apply && !RANKS.includes(apply)) throw new AccessError('Okänd nivå.', 400)

  // Spelaren måste finnas i laget
  const { data: inSquad } = await db.query(`SELECT 1 FROM squad_players WHERE player_id = $1 AND squad_id = app.squad_id()`, [p.playerId])
  if (!inSquad.length) throw new AccessError('Spelaren finns inte i laget.', 404)

  await db.query(
    `INSERT INTO player_level_assessments (squad_id, player_id, scores, suggested, applied_rank, comment, created_by)
     VALUES (app.squad_id(), $1, $2::jsonb, $3, $4, $5, $6)`,
    [p.playerId, JSON.stringify(scores), suggested.level, apply, p.comment?.trim() || null, req.user.id],
  )
  if (apply) await db.query(`UPDATE players SET rank = $2 WHERE id = $1`, [p.playerId, apply])
  return { suggested: suggested.level, applied: apply }
}
