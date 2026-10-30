import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
}

export default async function getAvailablePlayers(req: { params: Params; user: User }) {
  const { trainingId } = req.params

  const result = await db.query<{
    id: number
    shortname: string
    number: number | null
    comment: string | null
    status: string
  }>(
    `SELECT p.id, p.shortname, p.number, p.comment, p.status::text AS status
     FROM players p
     WHERE p.id NOT IN (
         SELECT COALESCE(player, -1)
         FROM participantstrainings
         WHERE training = $1
       )
     ORDER BY p.shortname`,
    [trainingId]
  )

  return result.data
}
