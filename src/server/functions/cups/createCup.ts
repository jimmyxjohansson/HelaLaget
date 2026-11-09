import { db } from '@/server/db'
import { squadGameFormat } from '@/server/gameFormats'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  name: string
  startdate: string
  enddate?: string | null
  location?: string | null
  indooroutdoor?: string | null
  matchplayers?: string | null
  playtime?: number | null
  periods?: number | null
}

/** Ny cup för valt lag. */
export default async function createCup(req: { params: Params; user: User; squad?: SquadAccess }) {
  const p = req.params
  if (!p.name?.trim()) throw new Error('Ange cupens namn.')
  if (!p.startdate) throw new Error('Ange startdatum.')
  // Utan angiven spelform gäller lagets spelform och föreningens speltid och perioder
  const fmt = p.matchplayers === undefined ? await squadGameFormat(req.squad!.squadId, db.query.bind(db)) : null
  const { data } = await db.query<{ id: number }>(
    `INSERT INTO cups (name, startdate, enddate, location, indooroutdoor, status, matchplayers, playtime, periods)
     VALUES ($1, $2::date, $3::date, $4, $5, 'Ny', $6, $7, $8)
     RETURNING id`,
    [p.name.trim(), p.startdate, p.enddate || p.startdate, p.location?.trim() || null, p.indooroutdoor || 'Utomhus',
      fmt ? fmt.format : p.matchplayers || null,
      fmt ? fmt.playtime : p.playtime ?? null,
      fmt ? fmt.periods : p.periods ?? null],
  )
  return { id: data[0].id }
}
