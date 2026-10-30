import { withAdminTransaction } from '@/server/db'
import { classify } from '@/server/svenskalag/classify'
import { createCup, createMatch, createTraining } from '@/server/svenskalag/sync'
import type { SquadAccess, User } from '@/server/types'

export const access = 'leader'

type Params = {
  externalId: number
  action: 'training' | 'match' | 'cup' | 'ignore'
}

const pad = (d: Date) => d.toISOString().slice(0, 16)

/** Vad en händelse i granskningslistan ska bli i Hela Laget. */
export default async function decideSvenskalagEvent(req: { params: Params; user: User; squad?: SquadAccess }) {
  const squadId = req.squad!.squadId
  const { externalId, action } = req.params
  if (!['training', 'match', 'cup', 'ignore'].includes(action)) throw new Error('Okänt val.')

  return withAdminTransaction(async (q) => {
    const { data } = await q<{
      title: string
      starts_at: Date | string
      ends_at: Date | string | null
      location: string | null
      description: string | null
      url: string | null
      decision: string
      club_name: string
      organization_id: number
    }>(
      `SELECT e.title, e.starts_at, e.ends_at, e.location, e.description, e.url, e.decision,
         o.name AS club_name, s.organization_id
       FROM svenskalag_events e
       JOIN squads s ON s.id = e.squad_id JOIN organizations o ON o.id = s.organization_id
       WHERE e.squad_id = $1 AND e.external_id = $2
       FOR UPDATE OF e`,
      [squadId, externalId],
    )
    const ev = data[0]
    if (!ev) throw new Error('Hittade inte händelsen.')
    if (ev.decision !== 'pending') throw new Error('Händelsen är redan hanterad.')

    // starts_at är lokal tid (timestamp utan tidszon), som pg tolkar som UTC
    const toWall = (v: Date | string | null) => (v === null ? null : v instanceof Date ? pad(v) : String(v).replace(' ', 'T').slice(0, 16))
    const event = {
      title: ev.title,
      start: toWall(ev.starts_at)!,
      end: toWall(ev.ends_at),
      location: ev.location ?? '',
      description: ev.description ?? '',
      url: ev.url ?? '',
    }

    let targetTable: string | null = null
    let targetId: number | null = null
    if (action === 'training') {
      targetTable = 'trainings'
      targetId = await createTraining(q, squadId, event, 'Träning', /inomhus|futsal/i.test(ev.title) || /hall/i.test(event.location))
    } else if (action === 'match') {
      const c = classify(
        { uid: '', summary: ev.title, description: '', location: event.location, start: event.start, end: event.end, status: '' },
        '',
        ev.club_name,
      )
      targetTable = 'matches'
      targetId = await createMatch(
        q,
        { id: squadId, organization_id: ev.organization_id, club_name: ev.club_name },
        event,
        c.kind === 'match' ? c : null,
      )
    } else if (action === 'cup') {
      targetTable = 'cups'
      targetId = await createCup(q, squadId, event)
    }

    await q(
      `UPDATE svenskalag_events SET decision = $3, target_table = $4, target_id = $5
       WHERE squad_id = $1 AND external_id = $2`,
      [squadId, externalId, action === 'ignore' ? 'ignored' : 'imported', targetTable, targetId],
    )
    return { targetTable, targetId }
  })
}

