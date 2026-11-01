import 'server-only'
import { after } from 'next/server'
import { adminDb } from '../db'
import { pushConfigured, sendToSquad, type PushPayload } from '../push'

/**
 * Notiser från matchens tidslinje: mål (våra och motståndarnas), periodstart,
 * paus och slutsignal. Skickas efter att svaret gått iväg (och transaktionen
 * är sparad), så att den som registrerar inte behöver vänta.
 *
 * Inga notiser skickas om matchen är avslutad, eller om den inte spelas i dag
 * (så att mål som registreras i efterhand inte väcker hela laget).
 */

type MatchInfo = {
  id: number
  squad_id: number
  /** Förening + lag, t.ex. "Skabersjö IF P-13" */
  squad_name: string
  squad_logo: string | null
  opponent: string
  opponent_logo: string | null
  homeaway: string | null
  ourgoals: number
  theirgoals: number
  periods: number | null
  status: string | null
  is_today: boolean
}

const FINISHED = ['Avslutad', 'Registrerad i Fogis']

async function loadMatch(matchId: number, squadId: number): Promise<MatchInfo | null> {
  const { data } = await adminDb.query<MatchInfo>(
    `SELECT m.id, m.squad_id, trim(concat_ws(' ', o.name, s.name)) AS squad_name,
            NULLIF(s.logo_url, '') AS squad_logo,
            COALESCE(NULLIF(t.team, ''), 'Motståndarna') AS opponent, NULLIF(t.imgurl, '') AS opponent_logo,
            m.homeaway::text AS homeaway, COALESCE(m.ourgoals, 0)::int AS ourgoals,
            COALESCE(m.theirgoals, 0)::int AS theirgoals, m.periods, m.status::text AS status,
            -- Tider sparas som väggklocka (17:30Z = 17:30 svensk tid)
            (m.date AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'Europe/Stockholm')::date AS is_today
     FROM matches m
     JOIN squads s ON s.id = m.squad_id
     JOIN organizations o ON o.id = s.organization_id
     LEFT JOIN teams t ON t.id = m.vs
     WHERE m.id = $1 AND m.squad_id = $2`,
    [matchId, squadId],
  )
  return data[0] ?? null
}

function shouldNotify(m: MatchInfo | null): m is MatchInfo {
  return !!m && !FINISHED.includes(m.status ?? '') && m.is_today
}

/** Markera en notis som skickad. Falskt om den redan var skickad. */
async function claim(matchId: number, key: string): Promise<boolean> {
  const { data } = await adminDb.query(
    `INSERT INTO match_notifications (match_id, key) VALUES ($1, $2)
     ON CONFLICT DO NOTHING RETURNING key`,
    [matchId, key],
  )
  return data.length > 0
}

/** "P13 2–1 IFK Malmö", med hemmalaget först. */
export function scoreline(m: Pick<MatchInfo, 'squad_name' | 'opponent' | 'homeaway' | 'ourgoals' | 'theirgoals'>) {
  return m.homeaway === 'Borta'
    ? `${m.opponent} ${m.theirgoals}–${m.ourgoals} ${m.squad_name}`
    : `${m.squad_name} ${m.ourgoals}–${m.theirgoals} ${m.opponent}`
}

function teams(m: MatchInfo) {
  return m.homeaway === 'Borta' ? `${m.opponent} – ${m.squad_name}` : `${m.squad_name} – ${m.opponent}`
}

// Samma reservlogga som i appen när laget saknar egen logga
const FALLBACK_LOGO = '/icons/icon-192.png'

/** Notisens bild: logga för laget som gjorde målet (annars vårt lags). */
function payload(m: MatchInfo, title: string, body: string, logo: 'ours' | 'theirs' = 'ours'): PushPayload {
  const icon = logo === 'theirs' ? (m.opponent_logo ?? '/icons/icon-192.png') : (m.squad_logo ?? FALLBACK_LOGO)
  return { title, body, icon, url: `/matches/${m.id}?lag=${m.squad_id}`, tag: `match-${m.id}` }
}

/** "24' " eller i tilläggstid "30+1' " (perioden sparas på händelsen). */
const minuteText = (minute: number | null, period?: number | null, playtime?: number | null) => {
  if (minute == null) return ''
  const end = period && playtime ? period * playtime : null
  return end && minute > end ? `${end}+${minute - end}' ` : `${minute}' `
}

/** Kör efter svaret; fel loggas men stoppar aldrig registreringen. */
function later(label: string, fn: () => Promise<void>) {
  if (!pushConfigured()) return
  after(async () => {
    try {
      await fn()
    } catch (e) {
      console.error(`[push] ${label} misslyckades`, e)
    }
  })
}

type Base = { squadId: number; matchId: number; userId: string }

/** Ny händelse i tidslinjen. Bara mål ger notis, och bara första gången. */
export function notifyGoal({ squadId, matchId, userId, eventId }: Base & { eventId: number }) {
  later('målnotis', async () => {
    const m = await loadMatch(matchId, squadId)
    if (!shouldNotify(m)) return
    const { data } = await adminDb.query<{
      goal: number | null
      save: number | null
      minute: number | null
      period: number | null
      playtime: number | null
      type: string | null
      scorer: string | null
      assister: string | null
    }>(
      `SELECT e.goal, e.save, e.minute, e.period, (SELECT m.playtime FROM matches m WHERE m.id = e.match) AS playtime, e.type::text AS type,
              COALESCE(g.shortname, NULLIF(trim(concat_ws(' ', g.firstname, g.lastname)), '')) AS scorer,
              COALESCE(a.shortname, NULLIF(trim(concat_ws(' ', a.firstname, a.lastname)), '')) AS assister
       FROM matchgoalsassists e
       LEFT JOIN players g ON g.id = e.goal
       LEFT JOIN players a ON a.id = e.assist
       WHERE e.id = $1 AND e.match = $2`,
      [eventId, matchId],
    )
    const e = data[0]
    if (!e || e.save != null) return
    if (!(await claim(matchId, `goal:${eventId}`))) return

    // Samma regel som saveMatchEvent: eget mål har målskytt eller är motståndarnas självmål.
    const ours = e.goal != null || e.type === 'Självmål'
    if (ours) {
      const who = e.goal != null ? (e.scorer ?? 'Okänd målskytt') : 'Självmål'
      const assist = e.assister ? ` (assist ${e.assister})` : ''
      const kind = e.goal != null && e.type && e.type !== 'Spelmål' ? ` · ${e.type}` : ''
      await sendToSquad(
        squadId,
        payload(m, `⚽ Mål för ${m.squad_name}!`, `${minuteText(e.minute, e.period, e.playtime)}${who}${assist}${kind}\n${scoreline(m)}`),
        userId,
      )
    } else {
      const kind = e.type && e.type !== 'Spelmål' ? ` · ${e.type === 'Självmål (motst.)' ? 'Självmål' : e.type}` : ''
      await sendToSquad(
        squadId,
        payload(m, `Mål för ${m.opponent}`, `${minuteText(e.minute, e.period, e.playtime)}${scoreline(m)}${kind}`, 'theirs'),
        userId,
      )
    }
  })
}

/** Ett mål som det redan skickats notis om har tagits bort: skicka rättad ställning. */
export function notifyGoalRemoved({ squadId, matchId, userId, eventId, minute }: Base & { eventId: number; minute: number | null }) {
  later('rättelse', async () => {
    const m = await loadMatch(matchId, squadId)
    if (!shouldNotify(m)) return
    const { data } = await adminDb.query(
      `DELETE FROM match_notifications WHERE match_id = $1 AND key = $2 RETURNING key`,
      [matchId, `goal:${eventId}`],
    )
    if (data.length === 0) return
    const when = minute != null ? `i ${minute}:e minuten ` : ''
    await sendToSquad(squadId, payload(m, 'Rättelse', `Målet ${when}är borttaget.\n${scoreline(m)}`), userId)
  })
}

const resultKey = (m: MatchInfo) => `result:${m.ourgoals}-${m.theirgoals}`

/**
 * Matchen har satts till Avslutad (knappen i tidslinjen eller status i
 * Redigera). Skickas en gång, och inte om slutsignalen redan gått ut med samma
 * resultat.
 */
export function notifyFinished({ squadId, matchId, userId }: Base) {
  later('avslutad', async () => {
    const m = await loadMatch(matchId, squadId)
    if (!m || m.status !== 'Avslutad' || !m.is_today) return
    if (!(await claim(matchId, 'finished'))) return
    if (!(await claim(matchId, resultKey(m)))) return
    const outcome = m.ourgoals > m.theirgoals ? 'Vinst' : m.ourgoals < m.theirgoals ? 'Förlust' : 'Oavgjort'
    await sendToSquad(
      squadId,
      payload(m, 'Matchen är avslutad', `Slutresultat: ${scoreline(m)} · ${outcome}`),
      userId,
    )
  })
}

/** Start eller stopp av en period i tidslinjens matchklocka. */
export function notifyClock({ squadId, matchId, userId, event, period }: Base & { event: 'start' | 'stop'; period: number }) {
  later('periodnotis', async () => {
    const m = await loadMatch(matchId, squadId)
    if (!shouldNotify(m)) return
    const periods = m.periods && m.periods > 0 ? m.periods : 1
    if (!Number.isInteger(period) || period < 1 || period > periods) return
    if (!(await claim(matchId, `${event}:${period}`))) return

    let title: string
    let body: string
    if (event === 'start') {
      if (period === 1) {
        title = `Avspark: ${teams(m)}`
        body = 'Matchen har börjat.'
      } else {
        title = `Period ${period} har börjat`
        body = scoreline(m)
      }
    } else if (period < periods) {
      title = periods === 2 ? 'Halvtid' : `Paus efter period ${period}`
      body = scoreline(m)
    } else {
      const outcome = m.ourgoals > m.theirgoals ? 'Vinst' : m.ourgoals < m.theirgoals ? 'Förlust' : 'Oavgjort'
      title = 'Slutsignal'
      body = `${scoreline(m)} · ${outcome}`
      // Avslutas matchen sedan med samma resultat behövs ingen notis till
      await claim(matchId, resultKey(m))
    }
    await sendToSquad(squadId, payload(m, title, body), userId)
  })
}
