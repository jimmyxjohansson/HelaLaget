import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  name: string
  startdate: string | null
  enddate: string | null
  location: string | null
  difficulty: string | null
  playtime: number | null
  periods: number | null
  matchplayers: string | null
  indooroutdoor: string | null
  svenskalag: string | null
  cupsite: string | null
  status: string
}

export default async function updateCup(req: { params: Params; user: User }) {
  const p = req.params

  const result = await db.query<{
    id: number
    name: string
    startdate: string | null
    enddate: string | null
    location: string | null
    difficulty: string | null
    playtime: number | null
    periods: number | null
    matchplayers: string | null
    indooroutdoor: string | null
    svenskalag: string | null
    status: string
    cupsite: string | null
  }>(
    `UPDATE cups SET
      name = $1,
      startdate = $2,
      enddate = $3,
      location = $4,
      difficulty = $5,
      playtime = $6,
      periods = $7,
      matchplayers = $8,
      indooroutdoor = $9,
      svenskalag = $10,
      cupsite = $11,
      status = $12
    WHERE id = $13
    RETURNING id, name, startdate, enddate, location, difficulty, playtime,
      periods, matchplayers, indooroutdoor, svenskalag, status, cupsite`,
    [
      p.name,
      p.startdate,
      p.enddate,
      p.location,
      p.difficulty,
      p.playtime,
      p.periods,
      p.matchplayers,
      p.indooroutdoor,
      p.svenskalag,
      p.cupsite,
      p.status,
      p.id,
    ]
  )

  return { cup: result.data[0] ?? null }
}
