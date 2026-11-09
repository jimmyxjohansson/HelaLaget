import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = {
  id?: number | null
  title: string
  body: string
  onTrainings: boolean
  onMatches: boolean
  audience: 'leaders' | 'all'
  onlyIndoorOutdoor?: string | null
  onlyHomeAway?: string | null
}

/** Skapa eller ändra en informationsruta. Adminfunktion utan RLS: alltid filtrerad på valt lag. */
export default async function saveSquadInfo(req: { params: Params; user: User; squad?: SquadAccess }) {
  const squadId = req.squad!.squadId
  const title = String(req.params.title ?? '').trim().slice(0, 80)
  const body = String(req.params.body ?? '').replace(/\r\n/g, '\n').slice(0, 4000)
  if (!title) throw new AccessError('Ge informationen en rubrik.', 400)
  const audience = req.params.audience === 'all' ? 'all' : 'leaders'
  const onT = !!req.params.onTrainings
  const onM = !!req.params.onMatches
  const io = req.params.onlyIndoorOutdoor === 'Inomhus' || req.params.onlyIndoorOutdoor === 'Utomhus' ? req.params.onlyIndoorOutdoor : null
  const ha = req.params.onlyHomeAway === 'Hemma' || req.params.onlyHomeAway === 'Borta' ? req.params.onlyHomeAway : null
  if (req.params.id) {
    const { data } = await adminDb.query<{ id: number }>(
      `UPDATE squad_infos SET title = $3, body = $4, on_trainings = $5, on_matches = $6, audience = $7,
         only_indooroutdoor = $8, only_homeaway = $9, updated_at = now()
       WHERE id = $1 AND squad_id = $2 RETURNING id`,
      [Number(req.params.id), squadId, title, body, onT, onM, audience, io, ha],
    )
    if (!data[0]) throw new AccessError('Informationen finns inte längre.', 404)
    return { id: data[0].id }
  }
  const { data } = await adminDb.query<{ id: number }>(
    `INSERT INTO squad_infos (squad_id, title, body, on_trainings, on_matches, audience, only_indooroutdoor, only_homeaway, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (SELECT COALESCE(MAX(position), -1) + 1 FROM squad_infos WHERE squad_id = $1))
     RETURNING id`,
    [squadId, title, body, onT, onM, audience, io, ha],
  )
  return { id: data[0].id }
}
