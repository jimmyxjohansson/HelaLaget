import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  match: number
  player: number
  status?: string
  position?: string | null
}

export default async function addParticipant(req: { params: Params; user: User }) {
  const { match, player } = req.params
  const status = req.params.status ?? 'Kommer'
  const position = req.params.position ?? null

  // Skip if already exists for this match (non-leader rows)
  const existing = await db.query<{ id: number }>(
    `SELECT id FROM participantsmatches
     WHERE match = $1 AND player = $2 AND leader IS NULL
     LIMIT 1`,
    [match, player]
  )

  if (existing.data.length > 0) {
    return { id: existing.data[0]!.id, created: false }
  }

  const result = await db.query<{ id: number }>(
    `INSERT INTO participantsmatches (match, player, status, position)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [match, player, status, position]
  )

  return { id: result.data[0]?.id, created: true }
}
