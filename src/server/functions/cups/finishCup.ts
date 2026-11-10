import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { id: number }

/** Sätter cupen som avslutad. Matcher som inte är avslutade räknas och returneras (de ändras inte). */
export default async function finishCup(req: { params: Params; user: User }) {
  const id = Number(req.params.id)
  const { data } = await db.query<{ unfinished: number }>(
    `UPDATE cups SET status = 'Avslutad' WHERE id = $1
     RETURNING (SELECT COUNT(*)::int FROM matches m WHERE m.cup = $1
                  AND COALESCE(m.status::text, '') NOT IN ('Avslutad', 'Registrerad i Fogis')) AS unfinished`,
    [id],
  )
  if (!data[0]) throw new AccessError('Cupen hittades inte.', 404)
  return { unfinished: data[0].unfinished }
}
