import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { id: number; firstname: string; lastname?: string | null; shortname?: string | null; active: boolean }

export default async function updateLeader(req: { params: Params; user: User }) {
  const p = req.params
  await db.query('UPDATE leaders SET firstname = $2, lastname = $3, shortname = $4, active = $5 WHERE id = $1', [
    p.id,
    p.firstname?.trim(),
    p.lastname?.trim() || null,
    p.shortname?.trim() || null,
    !!p.active,
  ])
  return { ok: true }
}
