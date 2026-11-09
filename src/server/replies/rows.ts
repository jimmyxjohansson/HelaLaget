import 'server-only'
import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { parseLists, type ListKey } from './parse'
import { eventDay, matchPerson, MATCH_STATUS, participantTable, REPORTED_TRAINING, squadPeople, TRAINING_STATUS, type Kind, type Person } from './people'

/** Dagens datum i Sverige, som UTC-midnatt (för "Idag"/"Igår" i Svenskalag). */
export function stockholmToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = parts.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * Svarstiden med år: Svenskalag visar bara dag och månad, så året är i år,
 * eller förra året om datumet annars skulle ligga i framtiden.
 */
export function replyStamp(day: string | null, time: string | null, today: Date): string | null {
  if (!day || !time) return null
  let y = today.getUTCFullYear()
  const [m, d] = day.split('-').map(Number)
  if (Date.UTC(y, m - 1, d) > today.getTime() + 86_400_000) y--
  return `${y}-${day}T${time}`
}

export async function loadEvent(kind: Kind, id: number) {
  if (kind === 'training') {
    const { data } = await db.query<{ date: string; title: string | null; reported: boolean | null }>(
      `SELECT date, type::text AS title, reported FROM trainings WHERE id = $1`, [id])
    if (!data[0]) throw new AccessError('Träningen hittades inte i laget.', 404)
    return { kind, id, ...data[0] }
  }
  if (kind === 'cup') {
    const { data } = await db.query<{ date: string; title: string | null }>(
      `SELECT startdate AS date, name AS title FROM cups WHERE id = $1`, [id])
    if (!data[0]) throw new AccessError('Cupen hittades inte i laget.', 404)
    return { kind, id, ...data[0], reported: false }
  }
  const { data } = await db.query<{ date: string; title: string | null }>(
    `SELECT m.date, COALESCE(t.team, m.teamname) AS title FROM matches m LEFT JOIN teams t ON t.id = m.vs WHERE m.id = $1`, [id])
  if (!data[0]) throw new AccessError('Matchen hittades inte i laget.', 404)
  return { kind, id, ...data[0], reported: false }
}

export async function currentStatuses(kind: Kind, id: number) {
  const { table, fk } = participantTable(kind)
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
  /** När svaret lämnades i Svenskalag, 'ÅÅÅÅ-MM-DDTHH:MM' (svensk tid) */
  repliedAt: string | null
  match: Person | null
  current: string | null
  next: string
  /** Redan rapporterad närvaro som inte skrivs över */
  locked: boolean
}

export async function buildRows(kind: Kind, id: number, lists: Partial<Record<ListKey, string[][] | null>>) {
  const event = await loadEvent(kind, id)
  const today = stockholmToday()
  const parsed = parseLists(lists, today)
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
      repliedAt: replyStamp(r.answeredDay, r.answeredTime, today),
      match,
      current: cur,
      next: statusMap[r.list],
      locked: kind === 'training' && !!cur && REPORTED_TRAINING.has(cur),
    }
  })
  return { event, rows, people: people.sort((a, b) => a.name.localeCompare(b.name, 'sv')) }
}
