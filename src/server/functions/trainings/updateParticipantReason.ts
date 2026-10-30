import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  playerId: number
  reason: string | null
  reasontime: string | null
}

export default async function updateParticipantReason(req: { params: Params; user: User }) {
  const { trainingId, playerId, reason, reasontime } = req.params

  await db.query(
    `UPDATE participantstrainings
     SET reason = $1, reasontime = $2
     WHERE training = $3 AND player = $4`,
    [reason || null, reasontime || null, trainingId, playerId]
  )

  return { success: true }
}
