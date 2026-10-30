import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  name: string
  status: string
  year: number | null
  season: string | null
  level: string | null
  age: string | null
  region: string | null
}

export default async function updateLeague(req: { params: Params; user: User }) {
  const { id, name, status, year, season, level, age, region } = req.params
  const result = await db.query<{
    id: number
    name: string
    status: string
    year: number | null
    season: string | null
    level: string | null
    age: string | null
    region: string | null
  }>(
    `UPDATE leagues
     SET name = $1, status = $2::status_enum_9c844f85, year = $3,
         season = $4, level = $5, age = $6, region = $7
     WHERE id = $8
     RETURNING id, name, status, year, season, level, age, region`,
    [name, status, year, season || null, level || null, age || null, region || null, id]
  )
  return result.data[0]
}
