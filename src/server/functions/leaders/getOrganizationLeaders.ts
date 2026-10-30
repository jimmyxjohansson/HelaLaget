import { db } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = Record<string, never>

/** Föreningens ledare som inte är med i valt lag, med vilka lag de är ledare i. */
export default async function getOrganizationLeaders(_req: { params: Params; user: User }) {
  const result = await db.query<{
    id: number
    firstname: string | null
    lastname: string | null
    shortname: string | null
    active: boolean | null
    squads: string | null
  }>(
    `SELECT l.id, l.firstname, l.lastname, l.shortname, l.active,
       (SELECT string_agg(s.name, ', ' ORDER BY s.name)
          FROM squad_leaders sl JOIN squads s ON s.id = sl.squad_id
          WHERE sl.leader_id = l.id) AS squads
     FROM leaders l
     WHERE NOT EXISTS (SELECT 1 FROM squad_leaders sl WHERE sl.leader_id = l.id AND sl.squad_id = app.squad_id())
     ORDER BY l.active DESC, l.shortname`,
  )
  return result.data
}
