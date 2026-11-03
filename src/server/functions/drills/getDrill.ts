import { db } from '@/server/db'
import { DRILL_COLUMNS, type DrillRow } from '@/server/drills/shared'
import type { SquadAccess, User } from '@/server/types'

type Params = { id: number }

export default async function getDrill(req: { params: Params; user: User; squad?: SquadAccess }) {
  // Spelare och Anhörig ser bara övningar som finns i en träningsplan i laget
  const viewerOnly = req.squad?.role === 'viewer'
  const { data } = await db.query<DrillRow & { usedCount: number }>(
    `SELECT ${DRILL_COLUMNS},
       (SELECT COUNT(*) FROM training_block_items i WHERE i.drill_id = d.id)::int AS "usedCount"
     FROM drills d WHERE d.id = $1
       AND (NOT $2::boolean OR EXISTS (
         SELECT 1 FROM training_block_items i JOIN training_blocks b ON b.id = i.block_id
         JOIN trainings t ON t.id = b.training_id
         WHERE i.drill_id = d.id AND t.squad_id = app.squad_id()))`,
    [req.params.id, viewerOnly],
  )
  return data[0] ?? null
}
