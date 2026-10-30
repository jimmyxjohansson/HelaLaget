import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  status?: string
  position?: string | null
}

export default async function updateParticipant(req: { params: Params; user: User }) {
  const { id } = req.params

  if (req.params.status !== undefined && req.params.position !== undefined) {
    await db.query(
      `UPDATE participantsmatches SET status = $1, position = $2 WHERE id = $3`,
      [req.params.status, req.params.position, id]
    )
  } else if (req.params.status !== undefined) {
    await db.query(
      `UPDATE participantsmatches SET status = $1 WHERE id = $2`,
      [req.params.status, id]
    )
  } else if (req.params.position !== undefined) {
    await db.query(
      `UPDATE participantsmatches SET position = $1 WHERE id = $2`,
      [req.params.position, id]
    )
  }

  return { success: true }
}
