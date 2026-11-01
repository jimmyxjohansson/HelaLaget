import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { id: number }

/** Ta bort en övning. I träningsplaner står kvar dess namn som rubrik. */
export default async function deleteDrill(req: { params: Params; user: User }) {
  await db.query(
    `UPDATE training_block_items i SET title = COALESCE(i.title, d.name)
     FROM drills d WHERE d.id = i.drill_id AND d.id = $1`,
    [req.params.id],
  )
  await db.query(`DELETE FROM drills WHERE id = $1`, [req.params.id])
  return { ok: true }
}
