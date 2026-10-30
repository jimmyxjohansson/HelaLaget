import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  name: string
  status: string
  year: number | null
  season: string | null
  level: string | null
  age: string | null
  region: string | null
}

export default async function createLeague(req: { params: Params; user: User }) {
  const { name, status, year, season, level, age, region } = req.params
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
    `INSERT INTO leagues (name, status, year, season, level, age, region)
     VALUES ($1, $2::status_enum_9c844f85, $3, $4, $5, $6, $7)
     RETURNING id, name, status, year, season, level, age, region`,
    [name, status, year, season || null, level || null, age || null, region || null]
  )
  return result.data[0]
}
