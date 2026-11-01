import { db } from '@/server/db'
import { ATTENDED_STATUSES, PAST_TRAINING, withinMonths } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  id: number
  months?: number | null
}

export default async function getPlayer(req: { params: Params; user: User }) {
  // 0 (or missing) means "all time"; positive integer means filter to last N months
  const months = req.params.months ?? 0

  const result = await db.query<{
    id: number
    firstname: string
    lastname: string
    shortname: string
    number: number
    birthdate: string | null
    rank: string | null
    active: boolean
    status: string
    backbone: string | null
    img: string | null
    defender: boolean
    defensivemidfielder: boolean
    offensivemidfielder: boolean
    winger: boolean
    striker: boolean
    goalkeeper: boolean
    memberid: number | null
    foot: string | null
    comment: string | null
    gender: string | null
    sessions_attended: string
    total_sessions: string
  }>(
    `SELECT
      p.*,
      COUNT(CASE WHEN pt.status::text IN ${ATTENDED_STATUSES} AND t.id IS NOT NULL THEN 1 END) AS sessions_attended,
      COUNT(t.id) AS total_sessions
    FROM players p
    LEFT JOIN participantstrainings pt ON pt.player = p.id
    LEFT JOIN trainings t ON t.id = pt.training
      AND ${PAST_TRAINING}
      AND ${withinMonths('$1')}
    WHERE p.id = $2
    GROUP BY p.id`,
    [months, req.params.id]
  )
  return result.data[0] ?? null
}
