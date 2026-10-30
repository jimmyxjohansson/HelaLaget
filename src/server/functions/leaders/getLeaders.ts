import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = Record<string, never>

/** Föreningens ledare (de som kan registreras som närvarande på träningar och matcher). */
export default async function getLeaders(_req: { params: Params; user: User }) {
  const result = await db.query<{ id: number; firstname: string | null; lastname: string | null; shortname: string | null; active: boolean | null }>(
    'SELECT id, firstname, lastname, shortname, active FROM leaders ORDER BY active DESC, shortname',
  )
  return result.data
}
