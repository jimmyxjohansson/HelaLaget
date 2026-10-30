import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
}

export default async function deleteMatch(req: { params: Params; user: User }) {
  const { id } = req.params

  await db.query(`DELETE FROM matchgoalsassists WHERE match = $1`, [id])
  await db.query(`DELETE FROM participantsmatches WHERE match = $1`, [id])
  await db.query(`DELETE FROM matches WHERE id = $1`, [id])

  return { success: true }
}
