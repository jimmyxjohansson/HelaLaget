import { db } from '@/server/db'
import { geocodeCity } from '@/server/geocode'
import type { User } from '@/server/types'

type Params = {
  team: string
  country: string | null
  imgurl: string | null
  city?: string | null
}

export default async function createTeam(req: { params: Params; user: User }) {
  const p = req.params
  const city = p.city?.trim() || null
  const coords = city ? await geocodeCity(city, p.country || null) : null
  const result = await db.query<{
    id: number
    team: string | null
    imgurl: string | null
    country: string | null
    city: string | null
    lat: number | null
    lng: number | null
  }>(
    `INSERT INTO teams (team, country, imgurl, city, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, team, imgurl, country, city, lat, lng`,
    [p.team, p.country || null, p.imgurl || null, city, coords?.lat ?? null, coords?.lng ?? null],
  )
  return result.data[0]
}
