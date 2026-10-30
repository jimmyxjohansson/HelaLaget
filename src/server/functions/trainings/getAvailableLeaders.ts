import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
}

export default async function getAvailableLeaders(req: { params: Params; user: User }) {
  const { trainingId } = req.params

  const result = await db.query<{
    id: number
    shortname: string
  }>(
    `SELECT l.id, l.shortname
     FROM leaders l
     WHERE l.active = true
       AND EXISTS (SELECT 1 FROM squad_leaders sl WHERE sl.leader_id = l.id AND sl.squad_id = app.squad_id())
       AND l.id NOT IN (
         SELECT COALESCE(leader, -1)
         FROM participantstrainings
         WHERE training = $1 AND leader IS NOT NULL
       )
     ORDER BY l.shortname`,
    [trainingId]
  )

  return result.data
}
