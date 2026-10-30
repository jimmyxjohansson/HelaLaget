import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { notifyClock } from '@/server/notifications/match'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  matchId: number
  /** 'start' = periodstart, 'stop' = klockan stoppad (paus eller slutsignal) */
  event: 'start' | 'stop'
  period: number
}

/** Anropas av tidslinjens matchklocka. Skickar notis om periodstart, paus och slutsignal. */
export default async function notifyMatchClock(req: { params: Params; user: User; squad?: SquadAccess }) {
  const { matchId, event, period } = req.params
  if (event !== 'start' && event !== 'stop') throw new AccessError('Okänd händelse.', 400)

  // Matchen måste höra till valt lag (RLS)
  const { data } = await db.query('SELECT 1 FROM matches WHERE id = $1', [matchId])
  if (data.length === 0 || !req.squad) throw new AccessError('Matchen hittades inte.', 404)

  notifyClock({ squadId: req.squad.squadId, matchId: Number(matchId), userId: req.user.id, event, period: Number(period) })
  return { success: true }
}
