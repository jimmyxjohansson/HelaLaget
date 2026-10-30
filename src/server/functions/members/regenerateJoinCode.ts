import { adminDb } from '@/server/db'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = Record<string, never>

/** Ny kod för att gå med i laget. Den gamla slutar fungera. */
export default async function regenerateJoinCode(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { data } = await adminDb.query<{ join_code: string }>(
    `UPDATE squads SET join_code = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
     WHERE id = $1 RETURNING join_code`,
    [req.squad!.squadId],
  )
  return { joinCode: data[0].join_code }
}
