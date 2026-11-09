import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { ATTENDED_STATUSES, COUNTED_STATUS, PAST_TRAINING, withinMonthsOf } from '@/server/attendance'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  leaderId: number
  /** Period i månader bakåt (0 = alla). */
  months?: number | null
}

/** Ledarens träningar under perioden, i samma form som spelarens (för statistikrutan). */
export default async function getLeaderStats(req: { params: Params; user: User; squad?: SquadAccess }) {
  if (req.squad?.role === 'viewer') throw new AccessError('Ledarstatistik är bara för ledare.', 403)
  const months = Math.max(0, Math.floor(req.params.months ?? 0))
  const { data } = await db.query<{
    id: number
    date: string
    type: string
    indooroutdoor: string | null
    status: string | null
    reason: string | null
    reasontime: string | null
    group: string | null
    counted: boolean
    attended: boolean
  }>(
    `SELECT t.id, t.date, t.type::text AS type, t.indooroutdoor::text AS indooroutdoor,
            pt.status::text AS status, NULLIF(trim(pt.reason), '') AS reason, pt.reasontime,
            NULL::text AS "group",
            (${PAST_TRAINING} AND ${COUNTED_STATUS}) AS counted,
            COALESCE(pt.status::text IN ${ATTENDED_STATUSES}, false) AS attended
     FROM participantstrainings pt
     JOIN trainings t ON t.id = pt.training
     WHERE pt.leader = $1
       AND t.date < (((now() AT TIME ZONE 'Europe/Stockholm')::date + 1)::timestamp AT TIME ZONE 'UTC')
       AND ${withinMonthsOf('t.date', '$2')}
     ORDER BY t.date DESC`,
    [Number(req.params.leaderId), months],
  )
  return { trainings: data }
}
