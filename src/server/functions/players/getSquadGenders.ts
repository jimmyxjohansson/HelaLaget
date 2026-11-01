import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = Record<string, never>

/**
 * Antal pojkar och flickor bland lagets spelare (utom Slutat). Har laget bara
 * det ena (eller inget angivet) döljs valen om kön i planering och grupper.
 */
export default async function getSquadGenders(_req: { params: Params; user: User }) {
  const { data } = await db.query<{ boys: number; girls: number; unknown: number }>(
    `SELECT COUNT(*) FILTER (WHERE p.gender = 'Pojke')::int AS boys,
            COUNT(*) FILTER (WHERE p.gender = 'Flicka')::int AS girls,
            COUNT(*) FILTER (WHERE p.gender IS NULL)::int AS unknown
     FROM players p
     JOIN squad_players sp ON sp.player_id = p.id AND sp.squad_id = app.squad_id()
     WHERE p.status::text <> 'Slutat'`,
  )
  const r = data[0] ?? { boys: 0, girls: 0, unknown: 0 }
  return { ...r, mixed: r.boys > 0 && r.girls > 0 }
}
