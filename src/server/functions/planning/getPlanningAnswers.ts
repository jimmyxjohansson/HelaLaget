import { db } from '@/server/db'
import { KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = { kind: 'match' | 'cup'; id: number }

/** Alla svar för en match/cup med anledningar. Nekat och Ej svarat först. */
export default async function getPlanningAnswers(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const k = KIND[kind]
  const { data } = await db.query<{ id: number; player: number; shortname: string | null; status: string | null; reason: string | null }>(
    `SELECT x.id, x.player, p.shortname, x.status::text AS status, x.reason
     FROM ${k.participants} x
     JOIN players p ON p.id = x.player
     WHERE x.${k.fk} = $1 AND x.leader IS NULL
     ORDER BY array_position(ARRAY['Nekat','Ej svarat','Förslag','Inbjuden','Reserv','Kommer'], x.status::text) NULLS LAST,
              p.shortname`,
    [Number(req.params.id)],
  )
  return data
}
