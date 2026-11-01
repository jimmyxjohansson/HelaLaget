import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import type { User } from '@/server/types'

type Params = { id: number; muted: boolean }

/** Tysta (eller slå på igen) notiserna för en enskild match. */
export default async function setMatchMuted(req: { params: Params; user: User }) {
  const { data } = await db.query<{ id: number }>(
    `UPDATE matches SET mute_notifications = $2 WHERE id = $1 RETURNING id`,
    [req.params.id, !!req.params.muted],
  )
  if (!data[0]) throw new AccessError('Matchen hittades inte.', 404)
  return { ok: true }
}
