import { db } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { externalId: number }

/** Kvittera att en händelse som tagits bort i Svenskalag är kontrollerad. */
export default async function acknowledgeRemovedEvent(req: { params: Params; user: User }) {
  await db.query(
    'UPDATE svenskalag_events SET removed_acknowledged = true WHERE squad_id = app.squad_id() AND external_id = $1',
    [req.params.externalId],
  )
  return { ok: true }
}
