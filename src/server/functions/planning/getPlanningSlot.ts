import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { attendanceLateral, fromDate, KIND, kindOf } from '@/server/planning/shared'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = {
  kind: 'match' | 'cup'
  id: number
  /** Träningsnärvaro räknas från detta datum (ÅÅÅÅ-MM-DD), null = alla */
  from?: string | null
}

export type SlotEvent = {
  id: number
  title: string
  imgurl: string | null
  date: string | null
  enddate: string | null
  homeaway: string | null
  matchplayers: string | null
  matchtype: string | null
  difficulty: string | null
  status: string | null
  svenskalag: string | null
  fogislink: string | null
  proposed: number
  invited: number
  coming: number
  declined: number
  reserve: number
}

export type SlotPlayer = {
  id: number
  player: number
  shortname: string | null
  fullname: string | null
  number: number | null
  birthdate: string | null
  rank: string | null
  gender: string | null
  playerstatus: string | null
  status: string | null
  reason: string | null
  position: string | null
  /** Har positionen Målvakt på spelarkortet */
  canGoalkeeper: boolean
  coming: number
  total: number
}

export type SlotLeader = { id: number; leader: number; shortname: string | null }

/** En kolumn i planeringen: matchens/cupens kort, kallade spelare och ledare. */
export default async function getPlanningSlot(req: { params: Params; user: User }) {
  const kind = kindOf(req.params.kind)
  const id = Number(req.params.id)
  const from = fromDate(req.params.from)
  const k = KIND[kind]

  const counts = `
    COUNT(*) FILTER (WHERE x.status::text = 'Förslag' AND x.leader IS NULL)::int AS proposed,
    COUNT(*) FILTER (WHERE x.status::text = 'Inbjuden' AND x.leader IS NULL)::int AS invited,
    COUNT(*) FILTER (WHERE x.status::text = 'Kommer' AND x.leader IS NULL)::int AS coming,
    COUNT(*) FILTER (WHERE x.status::text IN ('Nekat', 'Ej svarat') AND x.leader IS NULL)::int AS declined,
    COUNT(*) FILTER (WHERE x.status::text = 'Reserv' AND x.leader IS NULL)::int AS reserve`

  const { data: events } =
    kind === 'match'
      ? await db.query<SlotEvent>(
          `SELECT m.id, COALESCE(NULLIF(t.team, ''), m.teamname, 'Okänd motståndare') AS title, t.imgurl,
                  m.date, NULL::timestamptz AS enddate, m.homeaway::text AS homeaway, m.matchplayers::text AS matchplayers,
                  m.matchtype::text AS matchtype, m.difficulty::text AS difficulty, m.status::text AS status,
                  m.svenskalag, m.fogislink, ${counts}
           FROM matches m
           LEFT JOIN teams t ON t.id = m.vs
           LEFT JOIN participantsmatches x ON x.match = m.id
           WHERE m.id = $1
           GROUP BY m.id, t.team, t.imgurl`,
          [id],
        )
      : await db.query<SlotEvent>(
          `SELECT c.id, c.name AS title, NULL AS imgurl, c.startdate AS date, c.enddate,
                  NULL AS homeaway, NULL AS matchplayers, NULL AS matchtype, c.difficulty::text AS difficulty,
                  c.status::text AS status, c.svenskalag, NULL AS fogislink, ${counts}
           FROM cups c
           LEFT JOIN participantscups x ON x.cup = c.id
           WHERE c.id = $1
           GROUP BY c.id`,
          [id],
        )
  const event = events[0]
  if (!event) throw new AccessError(kind === 'match' ? 'Matchen hittades inte.' : 'Cupen hittades inte.', 404)

  const { data: players } = await db.query<SlotPlayer>(
    `SELECT x.id, x.player, p.shortname,
            NULLIF(trim(concat_ws(' ', p.firstname, p.lastname)), '') AS fullname,
            p.number, p.birthdate, p.rank::text AS rank, p.gender, p.status::text AS playerstatus,
            x.status::text AS status, x.reason, x.position::text AS position,
            COALESCE(p.goalkeeper, false) AS "canGoalkeeper",
            COALESCE(a.coming, 0) AS coming, COALESCE(a.total, 0) AS total
     FROM ${k.participants} x
     JOIN players p ON p.id = x.player
     ${attendanceLateral('$2')}
     WHERE x.${k.fk} = $1 AND x.leader IS NULL
     ORDER BY array_position(ARRAY['Kommer','Inbjuden','Förslag','Reserv','Ej svarat','Nekat'], x.status::text),
              p.rank NULLS LAST, p.shortname`,
    [id, from],
  )

  const { data: leaders } = await db.query<SlotLeader>(
    `SELECT x.id, x.leader, l.shortname
     FROM ${k.participants} x
     JOIN leaders l ON l.id = x.leader
     WHERE x.${k.fk} = $1 AND x.player IS NULL
     ORDER BY l.shortname`,
    [id],
  )

  const { data: availableLeaders } = await db.query<{ id: number; shortname: string | null }>(
    `SELECT l.id, l.shortname
     FROM leaders l
     JOIN squad_leaders sl ON sl.leader_id = l.id AND sl.squad_id = app.squad_id()
     WHERE l.active = true
       AND NOT EXISTS (SELECT 1 FROM ${k.participants} x WHERE x.${k.fk} = $1 AND x.leader = l.id)
     ORDER BY l.shortname`,
    [id],
  )

  return { event, players, leaders, availableLeaders }
}
