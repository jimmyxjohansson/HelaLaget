import 'server-only'
import { adminDb, withAdminTransaction, type Query } from '../db'
import { parseIcal, type IcalEvent } from './ical'
import {
  classify,
  cleanDescription,
  externalIdFromUid,
  splitSummary,
  svenskalagUrl,
  teamPathFromDescription,
  type Classified,
} from './classify'

export type SyncSummary = {
  createdTrainings: number
  createdMatches: number
  updated: number
  pending: number
  removed: number
  skipped: number
}

type SquadInfo = { id: number; organization_id: number; club_name: string; svenskalag_ical_url: string | null }

/** Lokal väggklocka 'ÅÅÅÅ-MM-DDTHH:MM' → så som appen sparar tider (väggklocka med Z). */
export const wallToStored = (wall: string) => `${wall}:00Z`

function todayInStockholm(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date()) + 'T00:00'
}

/** Accepterar webcal:// och https:// från svenskalag.se. */
export function normalizeFeedUrl(raw: string): string {
  const url = raw.trim().replace(/^webcal:\/\//i, 'https://')
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Kalenderlänken är inte en giltig adress.')
  }
  if (parsed.protocol !== 'https:' || !/(^|\.)svenskalag\.se$/i.test(parsed.hostname)) {
    throw new Error('Kalenderlänken måste vara en länk från svenskalag.se.')
  }
  return parsed.toString()
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(normalizeFeedUrl(url), { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`Svenskalag svarade ${res.status}.`)
    const text = await res.text()
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Länken gav ingen kalender. Kontrollera kalenderlänken.')
    return text
  } finally {
    clearTimeout(timer)
  }
}

async function findOrCreateOpponent(q: Query, organizationId: number, name: string): Promise<number> {
  const { data } = await q<{ id: number }>(
    `SELECT id FROM teams
     WHERE organization_id = $1
       AND lower(regexp_replace(team, '[:\\s]+', ' ', 'g')) = lower(regexp_replace($2, '[:\\s]+', ' ', 'g'))
     ORDER BY id LIMIT 1`,
    [organizationId, name],
  )
  if (data[0]) return data[0].id
  const created = await q<{ id: number }>('INSERT INTO teams (team, organization_id) VALUES ($1, $2) RETURNING id', [
    name,
    organizationId,
  ])
  return created.data[0].id
}

async function findLeague(q: Query, squadId: number, name: string | null): Promise<number | null> {
  if (!name) return null
  const { data } = await q<{ id: number }>(
    'SELECT id FROM leagues WHERE squad_id = $1 AND lower(name) = lower($2) ORDER BY id DESC LIMIT 1',
    [squadId, name],
  )
  return data[0]?.id ?? null
}

/** Anteckning från Svenskalags beskrivning, om den innehåller mer än samlingstiden. */
function notesFrom(description: string): string | null {
  const text = cleanDescription(description)
  return text.replace(/^Samling:[^\n]*\n*/i, '').trim() ? text : null
}

type EventData = {
  title: string
  start: string
  end: string | null
  location: string
  description: string
  url: string
}

export async function createTraining(
  q: Query,
  squadId: number,
  ev: EventData,
  type: string,
  indoor: boolean,
): Promise<number> {
  const { data } = await q<{ id: number }>(
    `INSERT INTO trainings (squad_id, type, date, date1, indooroutdoor, notes, svenskalag, reported)
     VALUES ($1, $2, $3::timestamptz, $4::date, $5, $6, $7, false) RETURNING id`,
    [squadId, type, wallToStored(ev.start), ev.start.slice(0, 10), indoor ? 'Inomhus' : 'Utomhus', notesFrom(ev.description), ev.url],
  )
  return data[0].id
}

export async function createMatch(
  q: Query,
  squad: { id: number; organization_id: number; club_name: string },
  ev: EventData,
  c: Extract<Classified, { kind: 'match' }> | null,
): Promise<number> {
  const vs = c ? await findOrCreateOpponent(q, squad.organization_id, c.opponent) : null
  const league = c ? await findLeague(q, squad.id, c.league) : null
  const teamname = c && c.ourTeam.toLowerCase() !== squad.club_name.toLowerCase() ? c.ourTeam : null
  const { data } = await q<{ id: number }>(
    `INSERT INTO matches (squad_id, matchtype, vs, date, homeaway, indooroutdoor, location, teamname, league, status, notes, svenskalag)
     VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, 'Ny', $10, $11) RETURNING id`,
    [
      squad.id,
      c?.matchtype ?? 'Serie',
      vs,
      wallToStored(ev.start),
      c?.homeaway ?? 'Hemma',
      c?.indoor ? 'Inomhus' : 'Utomhus',
      ev.location || null,
      teamname,
      league,
      c ? null : ev.title,
      ev.url,
    ],
  )
  return data[0].id
}

export async function createCup(q: Query, squadId: number, ev: EventData): Promise<number> {
  const indoor = /inomhus|futsal/i.test(ev.title) || /hall/i.test(ev.location)
  const { data } = await q<{ id: number }>(
    `INSERT INTO cups (squad_id, name, startdate, enddate, location, indooroutdoor, status, svenskalag)
     VALUES ($1, $2, $3::date, $4::date, $5, $6, 'Ny', $7) RETURNING id`,
    [squadId, ev.title, ev.start.slice(0, 10), (ev.end ?? ev.start).slice(0, 10), ev.location || null, indoor ? 'Inomhus' : 'Utomhus', ev.url],
  )
  return data[0].id
}

/**
 * Hämtar lagets Svenskalag-kalender och för in kommande händelser:
 * - träningar och matcher skapas automatiskt
 * - händelser som redan finns (samma Svenskalag-id i länken) uppdateras om tiden ändrats
 * - övrigt (cuper m.m.) läggs i granskningslistan
 * - föreningsaktiviteter hoppas över
 * - kommande händelser som försvunnit från Svenskalag markeras, inget raderas
 */
export async function syncSquad(squadId: number): Promise<SyncSummary> {
  const { data: squads } = await adminDb.query<SquadInfo>(
    `SELECT s.id, s.organization_id, o.name AS club_name, s.svenskalag_ical_url
     FROM squads s JOIN organizations o ON o.id = s.organization_id WHERE s.id = $1`,
    [squadId],
  )
  const squad = squads[0]
  if (!squad?.svenskalag_ical_url) throw new Error('Laget har ingen Svenskalag-kalender. Lägg in länken under Admin → Laginställningar.')

  let summary: SyncSummary
  try {
    const feed = parseIcal(await fetchFeed(squad.svenskalag_ical_url))
    summary = await withAdminTransaction((q) => applyFeed(q, squad, feed.name, feed.events, todayInStockholm()))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Okänt fel'
    await adminDb.query('UPDATE squads SET svenskalag_sync_message = $2 WHERE id = $1', [squadId, `Fel: ${message}`])
    throw e
  }
  const parts = [
    summary.createdTrainings && `${summary.createdTrainings} träningar`,
    summary.createdMatches && `${summary.createdMatches} matcher`,
  ].filter(Boolean)
  const message =
    `${parts.length ? `Nya: ${parts.join(', ')}. ` : 'Inga nya. '}` +
    `${summary.updated ? `${summary.updated} ändrade. ` : ''}` +
    `${summary.pending ? `${summary.pending} att granska. ` : ''}` +
    `${summary.removed ? `${summary.removed} borttagna i Svenskalag.` : ''}`
  await adminDb.query('UPDATE squads SET svenskalag_synced_at = now(), svenskalag_sync_message = $2 WHERE id = $1', [
    squadId,
    message.trim(),
  ])
  return summary
}

/** Själva synken mot databasen (exporterad för tester). Körs i en transaktion. */
export async function applyFeed(
  q: Query,
  squad: { id: number; organization_id: number; club_name: string },
  calendarName: string,
  events: IcalEvent[],
  today: string,
): Promise<SyncSummary> {
  // En synk i taget per lag (knappen och den dagliga körningen kan krocka).
  await q('SELECT pg_advisory_xact_lock(4711, $1)', [squad.id])
  const syncStart = (await q<{ now: string }>('SELECT now()::text AS now')).data[0].now

  const summary: SyncSummary = { createdTrainings: 0, createdMatches: 0, updated: 0, pending: 0, removed: 0, skipped: 0 }

  // Befintliga träningar, matcher och cuper som redan är kopplade till Svenskalag
  const { data: linkedRows } = await q<{ tbl: 'trainings' | 'matches' | 'cups'; id: number; ext: string; wall: string; location: string | null }>(
    `SELECT 'trainings' AS tbl, id, substring(svenskalag from '/(?:aktivitet|match)/([0-9]+)') AS ext,
            to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI') AS wall, NULL AS location
       FROM trainings WHERE squad_id = $1 AND svenskalag ~ '/(aktivitet|match)/[0-9]+'
     UNION ALL
     SELECT 'matches', id, substring(svenskalag from '/(?:aktivitet|match)/([0-9]+)'),
            to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI'), location
       FROM matches WHERE squad_id = $1 AND svenskalag ~ '/(aktivitet|match)/[0-9]+'
     UNION ALL
     SELECT 'cups', id, substring(svenskalag from '/(?:aktivitet|match)/([0-9]+)'),
            to_char(startdate, 'YYYY-MM-DD"T00:00"'), location
       FROM cups WHERE squad_id = $1 AND svenskalag ~ '/(aktivitet|match)/[0-9]+'`,
    [squad.id],
  )
  const linked = new Map(linkedRows.map((r) => [Number(r.ext), r]))

  const { data: known } = await q<{ external_id: string; decision: string; target_table: string | null; target_id: number | null }>(
    'SELECT external_id, decision, target_table, target_id FROM svenskalag_events WHERE squad_id = $1',
    [squad.id],
  )
  const knownById = new Map(known.map((k) => [Number(k.external_id), k]))
  const seen = new Set<number>()

  for (const ev of events) {
    const id = externalIdFromUid(ev.uid)
    if (!id || ev.start < today || ev.status === 'CANCELLED') continue
    seen.add(id)

    const c = classify(ev, calendarName, squad.club_name)
    const { title } = splitSummary(ev.summary)
    const teamPath = teamPathFromDescription(ev.description) ?? 'okant-lag'
    const data: EventData = {
      title,
      start: ev.start,
      end: ev.end,
      location: ev.location,
      description: ev.description,
      url: svenskalagUrl(teamPath, c.kind === 'match' ? 'match' : 'activity', id, c.kind === 'match' ? c.opponent : title),
    }

    const prev = knownById.get(id)
    const existing = linked.get(id)
    let decision = prev?.decision ?? 'pending'
    let targetTable = prev?.target_table ?? null
    let targetId = prev?.target_id ?? null

    if (existing) {
      // Finns redan i Hela Laget: uppdatera tid (och plats för matcher) om den ändrats i Svenskalag
      if (!prev || prev.decision === 'pending') decision = 'linked'
      targetTable = existing.tbl
      targetId = existing.id
      if (existing.tbl !== 'cups' && existing.wall !== ev.start) {
        if (existing.tbl === 'trainings') {
          await q('UPDATE trainings SET date = $2::timestamptz, date1 = $3::date WHERE id = $1 AND squad_id = $4', [
            existing.id, wallToStored(ev.start), ev.start.slice(0, 10), squad.id,
          ])
        } else {
          await q('UPDATE matches SET date = $2::timestamptz WHERE id = $1 AND squad_id = $3', [
            existing.id, wallToStored(ev.start), squad.id,
          ])
        }
        summary.updated++
      }
      if (existing.tbl === 'matches' && ev.location && existing.location !== ev.location) {
        await q('UPDATE matches SET location = $2 WHERE id = $1 AND squad_id = $3', [existing.id, ev.location, squad.id])
      }
    } else if (prev && ['ignored', 'club', 'auto', 'imported', 'linked'].includes(prev.decision)) {
      // Redan hanterad tidigare (t.ex. ignorerad, eller skapad men senare raderad i Hela Laget)
      summary.skipped++
    } else if (c.kind === 'club') {
      decision = 'club'
      summary.skipped++
    } else if (c.kind === 'training') {
      targetId = await createTraining(q, squad.id, data, c.type, c.indoor)
      targetTable = 'trainings'
      decision = 'auto'
      summary.createdTrainings++
    } else if (c.kind === 'match') {
      targetId = await createMatch(q, squad, data, c)
      targetTable = 'matches'
      decision = 'auto'
      summary.createdMatches++
    } else {
      decision = 'pending'
      summary.pending++
    }

    await q(
      `INSERT INTO svenskalag_events
         (squad_id, external_id, kind, title, starts_at, ends_at, location, description, url,
          decision, target_table, target_id, removed, last_seen)
       VALUES ($1, $2, $3, $4, $5::timestamp, $6::timestamp, $7, $8, $9, $10, $11, $12, false, $13::timestamptz)
       ON CONFLICT (squad_id, external_id) DO UPDATE SET
         kind = EXCLUDED.kind, title = EXCLUDED.title, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
         location = EXCLUDED.location, description = EXCLUDED.description, url = EXCLUDED.url,
         decision = EXCLUDED.decision, target_table = EXCLUDED.target_table, target_id = EXCLUDED.target_id,
         removed = false, removed_acknowledged = false, last_seen = EXCLUDED.last_seen`,
      [
        squad.id, id, c.kind, title, ev.start, ev.end, ev.location || null, cleanDescription(ev.description) || null,
        data.url, decision, targetTable, targetId, syncStart,
      ],
    )
  }

  // Kopplade kommande träningar/matcher vars händelse inte längre finns i Svenskalag
  for (const [id, row] of linked) {
    if (seen.has(id) || row.wall < today || knownById.has(id)) continue
    await q(
      `INSERT INTO svenskalag_events (squad_id, external_id, kind, title, starts_at, decision, target_table, target_id, removed, last_seen)
       VALUES ($1, $2, $3, $4, $5::timestamp, 'linked', $6, $7, true, $8::timestamptz)
       ON CONFLICT (squad_id, external_id) DO NOTHING`,
      [squad.id, id, row.tbl === 'matches' ? 'match' : row.tbl === 'cups' ? 'other' : 'training', '(borttagen i Svenskalag)', row.wall, row.tbl, row.id, syncStart],
    )
  }
  await q(
    `UPDATE svenskalag_events SET removed = true
     WHERE squad_id = $1 AND starts_at >= $2::timestamp AND last_seen < $3::timestamptz AND NOT removed
       AND decision NOT IN ('ignored', 'club')`,
    [squad.id, today, syncStart],
  )
  summary.removed = (
    await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM svenskalag_events
       WHERE squad_id = $1 AND removed AND NOT removed_acknowledged AND target_id IS NOT NULL AND starts_at >= $2::timestamp`,
      [squad.id, today],
    )
  ).data[0].n
  summary.pending = (
    await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM svenskalag_events
       WHERE squad_id = $1 AND decision = 'pending' AND NOT removed AND starts_at >= $2::timestamp`,
      [squad.id, today],
    )
  ).data[0].n

  return summary
}

/** Alla lag med kalenderlänk (för den dagliga körningen). */
export async function squadsWithFeed(): Promise<number[]> {
  const { data } = await adminDb.query<{ id: number }>(
    "SELECT id FROM squads WHERE svenskalag_ical_url IS NOT NULL AND svenskalag_ical_url <> '' ORDER BY id",
  )
  return data.map((r) => r.id)
}
