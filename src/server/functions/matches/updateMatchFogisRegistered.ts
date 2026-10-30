import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  fogisregistered: boolean
}

export default async function updateMatchFogisRegistered(req: { params: Params; user: User }) {
  const { id, fogisregistered } = req.params

  await db.query(
    `UPDATE matches SET fogisregistered = $1 WHERE id = $2`,
    [fogisregistered, id]
  )

  return { success: true }
}
