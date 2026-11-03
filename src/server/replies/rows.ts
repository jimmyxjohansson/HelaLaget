import 'server-only'
import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { parseLists, type ListKey } from './parse'
import { eventDay, matchPerson, MATCH_STATUS, REPORTED_TRAINING, squadPeople, TRAINING_STATUS, type Kind, type Person } from './people'

/** Dagens datum i Sverige, som UTC-midnatt (för "Idag"/"Igår" i Svenskalag). */
export function stockholmToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = parts.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export async function loadEvent(kind: Kind, id: number) {
  if (kind === 'training') {
    const { data } = await db.query<{ date: string; title: string | null; reported: boolean | null }>(
      `SELECT date, type::text AS title, reported FROM trainings WHERE id = $1`, [id])
    if (!data[0]) throw new AccessError('Träningen hittades inte i laget.', 404)
    return { kind, id, ...data[0] }
  }
  const { data } = await db.query<{ date: string; title: string | null }>(
    `SELECT m.date, COALESCE(t.team, m.teamname) AS title FROM matches m LEFT JOIN teams t ON t.id = m.vs WHERE m.id = $1`, [id])
  if (!data[0]) throw new AccessError('Matchen hittades inte i laget.', 404)
  return { kind, id, ...data[0], reported: false }
}

export async function currentStatuses(kind: Kind, id: number) {
  const table = kind === 'training' ? 'participantstrainings' : 'participantsmatches'
  const fk = kind === 'training' ? 'training' : 'match'
  const { data } = await db.query<{ player: number | null; leader: number | null; status: string | null }>(
    `SELECT player, leader, status::text AS status FROM ${table} WHERE ${fk} = $1`, [id])
  const map = new Map<string, string | null>()
  for (const r of data) map.set(r.player ? `player:${r.player}` : `leader:${r.leader}`, r.status)
  return map
}

export type ReplyRow = {
  key: string
  list: ListKey
  name: string
  comment: string | null
  answered: string | null
  /** Klockslaget, bara om svaret kom samma dag som aktiviteten */
  time: string | null
  match: Person | null
  current: string | null
  next: string
  /** Redan rapporterad närvaro som inte skrivs över */
  locked: boolean
}

export async function buildRows(kind: Kind, id: number, lists: Partial<Record<ListKey, string[][] | null>>) {
  const event = await loadEvent(kind, id)
  const parsed = parseLists(lists, stockholmToday())
  const { people, links } = await squadPeople()
  const current = await currentStatuses(kind, id)
  const day = eventDay(event.date)
  const statusMap = kind === 'training' ? TRAINING_STATUS : MATCH_STATUS
  const rows: ReplyRow[] = parsed.map((r, i) => {
    const match = matchPerson(r, people, links)
    const cur = match ? current.get(`${match.type}:${match.id}`) ?? null : null
    return {
      key: `${i}`,
      list: r.list,
      name: r.name,
      comment: r.comment,
      answered: r.answered,
      // Klockslaget behövs bara för Kan ej, och bara när svaret kom samma dag
      time: r.list === 'notattending' && r.answeredDay && r.answeredDay === day ? r.answeredTime : null,
      match,
      current: cur,
      next: statusMap[r.list],
      locked: kind === 'training' && !!cur && REPORTED_TRAINING.has(cur),
    }
  })
  return { event, rows, people: people.sort((a, b) => a.name.localeCompare(b.name, 'sv')) }
}
