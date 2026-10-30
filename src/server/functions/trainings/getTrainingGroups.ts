import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
}

export default async function getTrainingGroups(req: { params: Params; user: User }) {
  const { trainingId } = req.params

  const trainingRes = await db.query<{
    id: number
    type: string
    date: string
    indooroutdoor: string
  }>(
    `SELECT id, type, date, indooroutdoor
     FROM trainings
     WHERE id = $1`,
    [trainingId]
  )

  const participantsRes = await db.query<{
    player_id: number
    firstname: string
    lastname: string
    shortname: string
    number: number | null
    img: string | null
    rank: string | null
    status: string
    group_name: string | null
    grouprank: string | null
  }>(
    `SELECT
      p.id AS player_id,
      p.firstname,
      p.lastname,
      p.shortname,
      p.number,
      p.img,
      p.rank::text AS rank,
      pt.status::text AS status,
      pt."group" AS group_name,
      pt.grouprank
    FROM participantstrainings pt
    JOIN players p ON p.id = pt.player
    WHERE pt.training = $1
      AND pt.player IS NOT NULL
    ORDER BY p.rank::text NULLS LAST, p.shortname`,
    [trainingId]
  )

  return {
    training: trainingRes.data[0] ?? null,
    participants: participantsRes.data,
  }
}
