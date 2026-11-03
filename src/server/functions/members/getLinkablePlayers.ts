import { adminDb } from '@/server/db'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

/** Lagets spelare, för att koppla Spelare och Anhöriga till dem. */
export default async function getLinkablePlayers(req: { params: Record<string, never>; user: User; squad?: SquadAccess }) {
  const { data } = await adminDb.query<{ id: number; name: string; status: string | null }>(
    `SELECT p.id, COALESCE(NULLIF(trim(concat_ws(' ', p.firstname, p.lastname)), ''), p.shortname, '–') AS name,
            p.status::text AS status
     FROM players p JOIN squad_players sp ON sp.player_id = p.id AND sp.squad_id = $1
     ORDER BY (p.status::text = 'Slutat'), lower(COALESCE(p.firstname, p.shortname))`,
    [req.squad!.squadId],
  )
  return data
}
