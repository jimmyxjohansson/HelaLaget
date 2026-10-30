import { db } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = Record<string, never>

/** Föreningens spelare som inte är med i valt lag, med vilka lag de spelar i. */
export default async function getOrganizationPlayers(_req: { params: Params; user: User }) {
  const result = await db.query<{
    id: number
    firstname: string | null
    lastname: string | null
    shortname: string | null
    number: number | null
    status: string | null
    squads: string | null
  }>(
    `SELECT p.id, p.firstname, p.lastname, p.shortname, p.number, p.status::text AS status,
       (SELECT string_agg(s.name, ', ' ORDER BY s.name)
          FROM squad_players sp JOIN squads s ON s.id = sp.squad_id
          WHERE sp.player_id = p.id) AS squads
     FROM players p
     WHERE NOT EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id())
     ORDER BY p.shortname`,
  )
  return result.data
}
