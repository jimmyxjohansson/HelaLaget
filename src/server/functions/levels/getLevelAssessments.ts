import { db } from '@/server/db'
import { userNames } from '@/server/users'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { playerId: number }

/** Spelarens bedömningar enligt nivåmatrisen, senaste först. */
export default async function getLevelAssessments(req: { params: Params; user: User }) {
  const { data } = await db.query<{
    id: number
    scores: Record<string, string>
    suggested: string
    applied_rank: string | null
    comment: string | null
    created_by: string | null
    created_at: string
    matrix: string | null
  }>(
    `SELECT id, scores, suggested, applied_rank, comment, created_by, created_at, matrix
     FROM player_level_assessments WHERE player_id = $1 AND squad_id = app.squad_id()
     ORDER BY created_at DESC LIMIT 20`,
    [Number(req.params.playerId)],
  )
  const names = await userNames(data.map((d) => d.created_by))
  return data.map(({ created_by, ...d }) => ({ ...d, by: created_by ? names.get(created_by) ?? null : null }))
}
