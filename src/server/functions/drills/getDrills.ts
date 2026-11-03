import { db } from '@/server/db'
import { DRILL_COLUMNS, type DrillRow } from '@/server/drills/shared'
import { AccessError } from '@/server/access'
import type { SquadAccess, User } from '@/server/types'

type Params = Record<string, never>

/** Föreningens alla övningar (filtrering görs i appen). */
export default async function getDrills(req: { params: Params; user: User; squad?: SquadAccess }) {
  // Övningsbanken är för ledare. Spelare och Anhörig ser övningarna i träningsplanen.
  if (req.squad?.role === 'viewer') throw new AccessError('Övningsbanken är bara för ledare.', 403)
  const { data } = await db.query<DrillRow & { usedCount: number }>(
    `SELECT ${DRILL_COLUMNS},
       (SELECT COUNT(*) FROM training_block_items i WHERE i.drill_id = d.id)::int AS "usedCount"
     FROM drills d
     ORDER BY d.name`,
  )
  return data
}
