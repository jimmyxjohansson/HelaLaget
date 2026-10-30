import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  playerIds: number[]
  status: string
}

export default async function updateAttendanceStatus(req: { params: Params; user: User }) {
  const { trainingId, playerIds, status } = req.params

  if (!playerIds.length) return { updated: 0 }

  const result = await db.query(
    `UPDATE participantstrainings
     SET status = $1::status_enum_88b832b7
     WHERE training = $2
       AND player = ANY($3::int[])`,
    [status, trainingId, playerIds]
  )

  return { updated: result.data }
}
