import { db } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = Record<string, never>

type EventRow = {
  externalId: number
  title: string
  startsAt: string
  endsAt: string | null
  location: string | null
  description: string | null
  url: string | null
  kind: string
  targetTable: 'trainings' | 'matches' | 'cups' | null
  targetId: number | null
}

/** Status för Svenskalag-importen: senaste hämtning, händelser att granska och borttagna. */
export default async function getSvenskalagStatus(_req: { params: Params; user: User }) {
  const { data: squad } = await db.query<{ configured: boolean; syncedAt: string | null; message: string | null }>(
    `SELECT (svenskalag_ical_url IS NOT NULL AND svenskalag_ical_url <> '') AS configured,
       svenskalag_synced_at AS "syncedAt", svenskalag_sync_message AS message
     FROM squads WHERE id = app.squad_id()`,
  )
  const columns = `external_id::int AS "externalId", title, starts_at AS "startsAt", ends_at AS "endsAt", location,
    description, url, kind, target_table AS "targetTable", target_id AS "targetId"`
  const today = `(now() AT TIME ZONE 'Europe/Stockholm')::date`
  const [pending, removed] = await Promise.all([
    db.query<EventRow>(
      `SELECT ${columns} FROM svenskalag_events
       WHERE squad_id = app.squad_id() AND decision = 'pending' AND NOT removed AND starts_at >= ${today}
       ORDER BY starts_at`,
    ),
    db.query<EventRow>(
      `SELECT ${columns} FROM svenskalag_events
       WHERE squad_id = app.squad_id() AND removed AND NOT removed_acknowledged AND target_id IS NOT NULL
         AND starts_at >= ${today}
       ORDER BY starts_at`,
    ),
  ])
  return { ...(squad[0] ?? { configured: false, syncedAt: null, message: null }), pending: pending.data, removed: removed.data }
}
