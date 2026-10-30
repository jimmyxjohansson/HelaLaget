import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  name: string
  startdate: string
  enddate?: string | null
  location?: string | null
  indooroutdoor?: string | null
}

/** Ny cup för valt lag. */
export default async function createCup(req: { params: Params; user: User }) {
  const p = req.params
  if (!p.name?.trim()) throw new Error('Ange cupens namn.')
  if (!p.startdate) throw new Error('Ange startdatum.')
  const { data } = await db.query<{ id: number }>(
    `INSERT INTO cups (name, startdate, enddate, location, indooroutdoor, status)
     VALUES ($1, $2::date, $3::date, $4, $5, 'Ny')
     RETURNING id`,
    [p.name.trim(), p.startdate, p.enddate || p.startdate, p.location?.trim() || null, p.indooroutdoor || 'Utomhus'],
  )
  return { id: data[0].id }
}
