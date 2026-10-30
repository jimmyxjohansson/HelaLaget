import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  goalkeeper: number | null
}

export default async function updateMatchGoalkeeper(req: { params: Params; user: User }) {
  await db.query(
    `UPDATE matches SET goalkeeper = $1 WHERE id = $2`,
    [req.params.goalkeeper, req.params.id]
  )
  return { success: true }
}
