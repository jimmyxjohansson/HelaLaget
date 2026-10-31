import { db } from '@/server/db'
import { betweenDates } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  playerId: number
  // Valfri period, samma som närvarostatistiken (genomförda träningar till och med date2).
  date1?: string
  date2?: string
}

export default async function getPlayerTrainings(req: { params: Params; user: User }) {
  const { playerId, date1, date2 } = req.params
  const hasRange = !!date1 && !!date2

  const result = await db.query<{
    id: number
    date: string
    indooroutdoor: string | null
    type: string
    status: string | null
    reason: string | null
    reasontime: string | null
  }>(
    `SELECT
      t.id,
      t.date,
      t.indooroutdoor,
      t.type,
      pt.status,
      pt.reason,
      pt.reasontime
    FROM participantstrainings pt
    JOIN trainings t ON t.id = pt.training
    WHERE pt.player = $1 AND pt.leader IS NULL${
      hasRange ? `\n      AND ${betweenDates('$2', '$3')}` : ''
    }
    ORDER BY t.date DESC`,
    hasRange ? [playerId, date1, date2] : [playerId]
  )
  return result.data
}
