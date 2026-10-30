import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  team: string
  country: string | null
  imgurl: string | null
}

export default async function updateTeam(req: { params: Params; user: User }) {
  const p = req.params
  const result = await db.query<{
    id: number
    team: string | null
    imgurl: string | null
    country: string | null
  }>(
    `UPDATE teams SET team = $1, country = $2, imgurl = $3
     WHERE id = $4
     RETURNING id, team, imgurl, country`,
    [p.team, p.country || null, p.imgurl || null, p.id]
  )
  return result.data[0]
}
