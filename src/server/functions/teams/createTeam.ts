import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  team: string
  country: string | null
  imgurl: string | null
}

export default async function createTeam(req: { params: Params; user: User }) {
  const p = req.params
  const result = await db.query<{
    id: number
    team: string | null
    imgurl: string | null
    country: string | null
  }>(
    `INSERT INTO teams (team, country, imgurl)
     VALUES ($1, $2, $3)
     RETURNING id, team, imgurl, country`,
    [p.team, p.country || null, p.imgurl || null]
  )
  return result.data[0]
}
