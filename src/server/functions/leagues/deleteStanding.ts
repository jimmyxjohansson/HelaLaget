import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  league: number
  team: number
}

export default async function deleteStanding(req: { params: Params; user: User }) {
  const { league, team } = req.params
  const result = await db.query(
    `DELETE FROM seriesstandings WHERE league = $1 AND team = $2`,
    [league, team]
  )
  return { deleted: result.data }
}
