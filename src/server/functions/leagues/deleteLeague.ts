import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
}

export default async function deleteLeague(req: { params: Params; user: User }) {
  const { id } = req.params

  // Detach any matches from this league so the delete does not fail on FK.
  await db.query(
    `UPDATE matches SET league = NULL WHERE league = $1`,
    [id]
  )

  const result = await db.query(
    `DELETE FROM leagues WHERE id = $1`,
    [id]
  )

  return { deleted: result.data }
}
