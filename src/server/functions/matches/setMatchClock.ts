import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { notifyClock } from '@/server/notifications/match'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  matchId: number
  /** 'start' = periodstart, 'resume' = start från valfri minut, 'stop' = paus eller slutsignal */
  event: 'start' | 'resume' | 'stop'
  period: number
  /** Matchminut när klockan startas */
  offsetMinutes?: number
  /** Matchminut då perioden började */
  periodStartMinutes?: number
}

/**
 * Tidslinjens matchklocka. Sparas på matchen så att den fortsätter gå om sidan
 * laddas om eller en annan ledare öppnar matchen. Periodstart och stopp ger
 * notiser (avspark, paus, slutsignal); start från valfri minut gör det inte.
 */
export default async function setMatchClock(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { matchId, event } = req.params
  const period = Number(req.params.period)
  if (!['start', 'resume', 'stop'].includes(event)) throw new AccessError('Okänd händelse.', 400)
  if (!Number.isInteger(period) || period < 1 || period > 3) throw new AccessError('Ogiltig period.', 400)

  const { data } =
    event === 'stop'
      ? await db.query<{ id: number }>(
          `UPDATE matches SET clock_started_at = NULL, clock_period = NULL,
             clock_offset_minutes = NULL, clock_period_start_minutes = NULL
           WHERE id = $1 RETURNING id`,
          [matchId],
        )
      : await db.query<{ id: number }>(
          `UPDATE matches SET clock_started_at = now(), clock_period = $2,
             clock_offset_minutes = $3, clock_period_start_minutes = $4
           WHERE id = $1 RETURNING id`,
          [matchId, period, Math.max(0, Math.floor(Number(req.params.offsetMinutes) || 0)),
            Math.max(0, Math.floor(Number(req.params.periodStartMinutes) || 0))],
        )
  if (data.length === 0 || !req.squad) throw new AccessError('Matchen hittades inte.', 404)

  if (event !== 'resume') {
    notifyClock({ squadId: req.squad.squadId, matchId: Number(matchId), userId: req.user.id, event, period })
  }

  const { data: clock } = await db.query<{ clock_started_at: string | null }>(
    'SELECT clock_started_at FROM matches WHERE id = $1',
    [matchId],
  )
  return { success: true, startedAt: clock[0]?.clock_started_at ?? null }
}
