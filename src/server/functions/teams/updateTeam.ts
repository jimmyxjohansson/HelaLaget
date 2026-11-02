import { db } from '@/server/db'
import { geocodeCity } from '@/server/geocode'
import type { User } from '@/server/types'

type Params = {
  id: number
  team: string
  country: string | null
  imgurl: string | null
  city?: string | null
}

export default async function updateTeam(req: { params: Params; user: User }) {
  const p = req.params
  const city = p.city?.trim() || null
  // Koordinaterna hämtas bara när orten eller landet ändrats
  const { data: before } = await db.query<{ city: string | null; country: string | null; lat: number | null }>(
    `SELECT city, country, lat FROM teams WHERE id = $1`, [p.id])
  const prev = before[0]
  const country = p.country || null
  const same = prev && (prev.city ?? null) === city && (prev.country ?? null) === country
  const coords = same ? undefined : city ? await geocodeCity(city, country) : null

  const result = await db.query<{
    id: number
    team: string | null
    imgurl: string | null
    country: string | null
    city: string | null
    lat: number | null
    lng: number | null
  }>(
    coords === undefined
      ? `UPDATE teams SET team = $1, country = $2, imgurl = $3, city = $5
         WHERE id = $4
         RETURNING id, team, imgurl, country, city, lat, lng`
      : `UPDATE teams SET team = $1, country = $2, imgurl = $3, city = $5, lat = $6, lng = $7
         WHERE id = $4
         RETURNING id, team, imgurl, country, city, lat, lng`,
    coords === undefined
      ? [p.team, country, p.imgurl || null, p.id, city]
      : [p.team, country, p.imgurl || null, p.id, city, coords?.lat ?? null, coords?.lng ?? null],
  )
  return result.data[0]
}
