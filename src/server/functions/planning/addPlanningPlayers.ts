import { db } from '@/server/db'
import { ids, KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; id: number; playerIds: number[] }

/** Lägg till spelare som Förslag. Spelare som redan är kallade hoppas över. */
export default async function addPlanningPlayers(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const playerIds = ids(req.params.playerIds)
  if (playerIds.length === 0) return { added: 0 }
  const { data } = await db.query<{ id: number }>(
    `INSERT INTO ${k.participants} (${k.fk}, player, status)
     SELECT $1, p, 'Förslag'::${k.statusType}
     FROM unnest($2::int[]) AS p
     WHERE EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p AND sp.squad_id = app.squad_id())
       AND NOT EXISTS (SELECT 1 FROM ${k.participants} x WHERE x.${k.fk} = $1 AND x.player = p AND x.leader IS NULL)
     RETURNING id`,
    [Number(req.params.id), playerIds],
  )
  return { added: data.length }
}
