import { adminDb, db } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'admin'

type Params = { before?: string | null; limit?: number }

export type PushLogRow = {
  id: number
  createdAt: string
  audience: 'squad' | 'leaders' | 'admins'
  title: string
  body: string | null
  url: string | null
  sentByName: string | null
  people: number
  devices: number
  failed: number
}

/** Lagets skickade notiser, senaste först. Bläddra bakåt med before (createdAt för sista raden). */
export default async function getPushLog(req: { params: Params; user: User }) {
  const limit = Math.min(Math.max(Number(req.params.limit) || 50, 1), 200)
  const { data } = await db.query<Omit<PushLogRow, 'sentByName'> & { sentBy: string | null }>(
    `SELECT id::int, created_at AS "createdAt", audience, title, body, url, sent_by AS "sentBy", people, devices, failed
     FROM push_log
     WHERE ($1::timestamptz IS NULL OR created_at < $1::timestamptz)
     ORDER BY created_at DESC
     LIMIT $2`,
    [req.params.before ?? null, limit + 1],
  )
  const rows = data.slice(0, limit)
  // Namn på avsändarna från kontona; aldrig e-postadressen, bara delen före @ om namn saknas
  const ids = Array.from(new Set(rows.map((r) => r.sentBy).filter((v): v is string => !!v)))
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: u } = await adminDb.query<{ id: string; name: string }>(
      `SELECT id, COALESCE(NULLIF(raw_user_meta_data->>'name', ''), split_part(email, '@', 1)) AS name
       FROM auth.users WHERE id = ANY($1::uuid[])`,
      [ids],
    )
    for (const x of u) names.set(x.id, x.name)
  }
  return {
    rows: rows.map(({ sentBy, ...r }) => ({ ...r, sentByName: sentBy ? names.get(sentBy) ?? null : null })) as PushLogRow[],
    more: data.length > limit,
  }
}
