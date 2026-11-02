import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = Record<string, never>

/**
 * Spelarstatusar som finns bland lagets spelare, med antal. Filter för
 * statusar som ingen spelare har döljs.
 */
export default async function getSquadStatuses(_req: { params: Params; user: User }) {
  const { data } = await db.query<{ status: string; count: number }>(
    `SELECT p.status::text AS status, COUNT(*)::int AS count
     FROM players p
     JOIN squad_players sp ON sp.player_id = p.id AND sp.squad_id = app.squad_id()
     WHERE p.status IS NOT NULL
     GROUP BY 1`,
  )
  return data
}
