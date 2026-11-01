import { db } from '@/server/db'
import { DRILL_COLUMNS, type DrillRow } from '@/server/drills/shared'
import type { User } from '@/server/types'

type Params = { id: number }

export default async function getDrill(req: { params: Params; user: User }) {
  const { data } = await db.query<DrillRow & { usedCount: number }>(
    `SELECT ${DRILL_COLUMNS},
       (SELECT COUNT(*) FROM training_block_items i WHERE i.drill_id = d.id)::int AS "usedCount"
     FROM drills d WHERE d.id = $1`,
    [req.params.id],
  )
  return data[0] ?? null
}
