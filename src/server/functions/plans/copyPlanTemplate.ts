import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { id: number }

/** Kopierar en mall. Kopian heter "Namn (kopia)", "Namn (kopia 2)" osv. */
export default async function copyPlanTemplate(req: { params: Params; user: User }) {
  const { data } = await db.query<{ name: string; blocks: unknown }>(
    `SELECT name, blocks FROM plan_templates WHERE id = $1`,
    [req.params.id],
  )
  const t = data[0]
  if (!t) throw new AccessError('Mallen finns inte längre.', 404)
  const { data: names } = await db.query<{ name: string }>(`SELECT lower(name) AS name FROM plan_templates`)
  const taken = new Set(names.map((n) => n.name))
  const base = t.name.replace(/ \(kopia( \d+)?\)$/, '').slice(0, 68)
  let name = `${base} (kopia)`
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (kopia ${n})`
  const ins = await db.query<{ id: number }>(
    `INSERT INTO plan_templates (name, blocks) VALUES ($1, $2::jsonb) RETURNING id`,
    [name, JSON.stringify(t.blocks)],
  )
  return { id: ins.data[0].id, name }
}
