import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
}

export default async function deleteTeam(req: { params: Params; user: User }) {
  const result = await db.query<{ id: number }>(
    `DELETE FROM teams WHERE id = $1 RETURNING id`,
    [req.params.id]
  )
  return result.data[0]
}
