import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { id: number }

export default async function deletePlanTemplate(req: { params: Params; user: User }) {
  await db.query(`DELETE FROM plan_templates WHERE id = $1`, [req.params.id])
  return { ok: true }
}
