import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = Record<string, never>

/** Lagets ledare (de som kan registreras som närvarande på träningar och matcher). */
export default async function getLeaders(_req: { params: Params; user: User }) {
  const result = await db.query<{ id: number; firstname: string | null; lastname: string | null; shortname: string | null; active: boolean | null }>(
    `SELECT l.id, l.firstname, l.lastname, l.shortname, l.active FROM leaders l
     WHERE EXISTS (SELECT 1 FROM squad_leaders sl WHERE sl.leader_id = l.id AND sl.squad_id = app.squad_id())
     ORDER BY l.active DESC, l.shortname`,
  )
  return result.data
}
