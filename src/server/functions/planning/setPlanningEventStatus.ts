import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { notifyFinished } from '@/server/notifications/match'
import { EVENT_STATUSES, kindOf } from '@/server/planning/shared'
import type { SquadAccess, User } from '@/server/types'

type Params = { kind: 'match' | 'cup'; id: number; status: string }

/** Ändra status för matchen/cupen (Ny, Förslag, Kallad …). */
export default async function setPlanningEventStatus(req: { params: Params; user: User; squad?: SquadAccess }) {
  const kind = kindOf(req.params.kind)
  const id = Number(req.params.id)
  const status = req.params.status
  if (!EVENT_STATUSES[kind].includes(status)) throw new AccessError('Okänd status.', 400)

  if (kind === 'cup') {
    const { data } = await db.query('UPDATE cups SET status = $1 WHERE id = $2 RETURNING id', [status, id])
    if (data.length === 0) throw new AccessError('Cupen hittades inte.', 404)
    return { success: true }
  }

  const { data: before } = await db.query<{ status: string | null; ourgoals: number; theirgoals: number }>(
    'SELECT status::text AS status, ourgoals, theirgoals FROM matches WHERE id = $1',
    [id],
  )
  if (before.length === 0) throw new AccessError('Matchen hittades inte.', 404)

  if (status === 'Avslutad' && before[0].status !== 'Avslutad') {
    // Samma som Avsluta i tidslinjen: resultat, klockan stoppas och notis går ut
    const our = Number(before[0].ourgoals ?? 0)
    const their = Number(before[0].theirgoals ?? 0)
    const outcome = our > their ? 'Vinst' : their > our ? 'Förlust' : 'Oavgjort'
    await db.query(
      `UPDATE matches SET status = 'Avslutad', outcome = $1,
         clock_started_at = NULL, clock_period = NULL, clock_offset_minutes = NULL, clock_period_start_minutes = NULL
       WHERE id = $2`,
      [outcome, id],
    )
    if (req.squad) notifyFinished({ squadId: req.squad.squadId, matchId: id, userId: req.user.id })
  } else {
    await db.query('UPDATE matches SET status = $1 WHERE id = $2', [status, id])
  }
  return { success: true }
}
