import 'server-only'
import { db } from '@/server/db'
import { nameKey, type ListKey, type ParsedReply } from './parse'

export type Kind = 'training' | 'match' | 'cup'

/** Tolkar typen som skickas från appen. */
export function parseKind(v: unknown): Kind {
  return v === 'match' || v === 'cup' ? v : 'training'
}

/** Deltagartabellen och kolumnen som pekar på aktiviteten. */
export function participantTable(kind: Kind) {
  if (kind === 'training') return { table: 'participantstrainings', fk: 'training' }
  if (kind === 'match') return { table: 'participantsmatches', fk: 'match' }
  return { table: 'participantscups', fk: 'cup' }
}
export type Person = { type: 'player' | 'leader'; id: number; name: string }

/** Lagets spelare och ledare, och sparade kopplingar från Svenskalag-namn. */
export async function squadPeople() {
  const [players, leaders, links] = await Promise.all([
    db.query<{ id: number; firstname: string | null; lastname: string | null; shortname: string | null }>(
      `SELECT p.id, p.firstname, p.lastname, p.shortname FROM players p
       WHERE EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id())`,
    ),
    db.query<{ id: number; firstname: string | null; lastname: string | null; shortname: string | null }>(
      `SELECT l.id, l.firstname, l.lastname, l.shortname FROM leaders l
       WHERE EXISTS (SELECT 1 FROM squad_leaders sl WHERE sl.leader_id = l.id AND sl.squad_id = app.squad_id())`,
    ),
    db.query<{ name_key: string; player: number | null; leader: number | null }>(
      `SELECT name_key, player, leader FROM svenskalag_name_links WHERE squad_id = app.squad_id()`,
    ),
  ])
  const full = (r: { firstname: string | null; lastname: string | null; shortname: string | null }) =>
    [r.firstname, r.lastname].filter(Boolean).join(' ').trim() || r.shortname || '–'
  const people: Person[] = [
    ...players.data.map((r) => ({ type: 'player' as const, id: r.id, name: full(r) })),
    ...leaders.data.map((r) => ({ type: 'leader' as const, id: r.id, name: full(r) })),
  ]
  return { people, links: links.data }
}

/** Kopplar ett namn från Svenskalag till en person i laget. */
export function matchPerson(r: ParsedReply, people: Person[], links: { name_key: string; player: number | null; leader: number | null }[]) {
  const key = nameKey(r.name)
  const link = links.find((l) => l.name_key === key)
  if (link) {
    const p = people.find((x) => (link.player ? x.type === 'player' && x.id === link.player : x.type === 'leader' && x.id === link.leader))
    if (p) return p
  }
  const exact = people.filter((p) => nameKey(p.name) === key)
  const prefer = (list: Person[]) => {
    if (list.length <= 1) return list[0] ?? null
    const typed = list.filter((p) => p.type === (r.leaderRole ? 'leader' : 'player'))
    return typed.length === 1 ? typed[0] : null
  }
  const hit = prefer(exact)
  if (hit) return hit
  // Förnamn och första efternamnet, t.ex. "Elias Wister Larsson" mot "Elias Wister"
  const parts = key.split(' ')
  if (parts.length >= 2) {
    const loose = people.filter((p) => {
      const pk = nameKey(p.name).split(' ')
      return pk[0] === parts[0] && pk.length >= 2 && (parts.slice(1).includes(pk[1]) || pk.slice(1).includes(parts[1]))
    })
    const h = prefer(loose)
    if (h) return h
  }
  return null
}

export const TRAINING_STATUS: Record<ListKey, string> = { attending: 'Anmäld', notattending: 'Ej närvarande', invited: 'Kallad' }
export const MATCH_STATUS: Record<ListKey, string> = { attending: 'Kommer', notattending: 'Nekat', invited: 'Inbjuden' }

/** Rapporterade statusar på träningar som svaren från Svenskalag inte ska skriva över. */
export const REPORTED_TRAINING = new Set(['Närvarande', 'Närvarande, ej hela', 'Anmäld, kom ej', 'Annan aktivitet'])

/** Evenemangets datum som MM-DD (tider sparas som väggklocka i UTC). */
export function eventDay(date: string) {
  const d = new Date(date)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
