import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  leaderId: number
  reason: string | null
  reasontime: string | null
}

export default async function updateLeaderReason(req: { params: Params; user: User }) {
  const { trainingId, leaderId, reason, reasontime } = req.params

  await db.query(
    `UPDATE participantstrainings
     SET reason = $1, reasontime = $2
     WHERE training = $3 AND leader = $4`,
    [reason || null, reasontime || null, trainingId, leaderId]
  )

  return { success: true }
}
