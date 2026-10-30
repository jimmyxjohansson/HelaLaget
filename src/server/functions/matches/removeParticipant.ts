import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
}

export default async function removeParticipant(req: { params: Params; user: User }) {
  await db.query(
    `DELETE FROM participantsmatches WHERE id = $1`,
    [req.params.id]
  )
  return { success: true }
}
