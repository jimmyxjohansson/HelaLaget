import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  reason: string | null
}

export default async function updateParticipantReason(req: { params: Params; user: User }) {
  const { id, reason } = req.params

  await db.query(
    `UPDATE participantsmatches SET reason = $1 WHERE id = $2`,
    [reason || null, id]
  )

  return { success: true }
}
