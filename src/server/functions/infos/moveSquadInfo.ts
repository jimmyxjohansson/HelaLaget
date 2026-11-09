import { adminDb } from '@/server/db'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

/** Sparar ordningen på lagets information (id:n i den nya ordningen). */
export default async function moveSquadInfo(req: { params: { ids: number[] }; user: User; squad?: SquadAccess }) {
  const ids = (req.params.ids ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0)
  await adminDb.query(
    `UPDATE squad_infos s SET position = o.pos
     FROM unnest($1::int[]) WITH ORDINALITY AS o(id, pos)
     WHERE s.id = o.id AND s.squad_id = $2`,
    [ids, req.squad!.squadId],
  )
  return { ok: true }
}
