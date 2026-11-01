/** Matchklockan som den sparas på matchen (se setMatchClock). */
export type StoredClock = {
  clock_started_at?: string | null
  clock_period?: number | null
  clock_offset_minutes?: number | null
  clock_period_start_minutes?: number | null
  /** Serverns klocka när matchen hämtades */
  server_now?: string
}

export type RunningClock = {
  /** När klockan startades, i den här enhetens tid (ms) */
  startedAt: number
  offsetMinutes: number
  periodStartMinutes: number
  period: 1 | 2 | 3
}

/** En klocka som glömts igång längre än så räknas som stoppad. */
const MAX_RUNNING_MS = 6 * 60 * 60 * 1000

/**
 * Pågående klocka från matchens sparade värden, eller null om den står.
 * Rättar för att telefonens klocka kan gå fel jämfört med servern.
 * Anropa direkt när matchen hämtats.
 */
export function runningClock(m: StoredClock | null | undefined): RunningClock | null {
  if (!m?.clock_started_at || !m.clock_period) return null
  const started = Date.parse(m.clock_started_at)
  const serverNow = m.server_now ? Date.parse(m.server_now) : Date.now()
  if (Number.isNaN(started) || serverNow - started > MAX_RUNNING_MS) return null
  const skew = serverNow - Date.now()
  return {
    startedAt: started - skew,
    offsetMinutes: m.clock_offset_minutes ?? 0,
    periodStartMinutes: m.clock_period_start_minutes ?? 0,
    period: Math.min(3, Math.max(1, m.clock_period)) as 1 | 2 | 3,
  }
}

/** Matchtid i sekunder just nu. */
export function clockSeconds(c: RunningClock, now = Date.now()) {
  return c.offsetMinutes * 60 + Math.floor(Math.max(0, now - c.startedAt) / 1000)
}

export function formatClock(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}

/** Matchminut som i en livesändning: 00:00–00:59 är 1', 23:00–23:59 är 24'. */
export function formatMinute(totalSeconds: number) {
  return `${Math.floor(Math.max(0, totalSeconds) / 60) + 1}'`
}
