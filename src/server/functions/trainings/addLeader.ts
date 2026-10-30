import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  leaderId: number
  status: string
}

export default async function addLeader(req: { params: Params; user: User }) {
  const { trainingId, leaderId, status } = req.params

  const result = await db.query<{ id: number }>(
    `INSERT INTO participantstrainings (training, leader, status)
     VALUES ($1, $2, $3::status_enum_88b832b7)
     RETURNING id`,
    [trainingId, leaderId, status]
  )

  return result.data[0] ?? null
}
