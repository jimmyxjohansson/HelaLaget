/** Kalenderhjälp för datumväljaren: veckan börjar på måndag, ISO-veckonummer. */

export const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
export const WEEKDAYS_SHORT = ['må', 'ti', 'on', 'to', 'fr', 'lö', 'sö']
const WEEKDAY_OF = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör']

const pad = (n: number) => String(n).padStart(2, '0')

export function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** "2026-10-31" → { y: 2026, m: 9, d: 31 }, eller null om ogiltigt. */
export function parseIso(v: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '')
  if (!match) return null
  const y = Number(match[1]), m = Number(match[2]) - 1, d = Number(match[3])
  const date = new Date(Date.UTC(y, m, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) return null
  return { y, m, d }
}

/** Dagens datum i svensk tid. */
export function todayIso() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
}

/** Veckodag kort, t.ex. "lör". */
export function weekdayName(iso: string) {
  const p = parseIso(iso)
  return p ? WEEKDAY_OF[new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay()] : ''
}

/** ISO-veckonummer (vecka 1 innehåller årets första torsdag). */
export function isoWeek(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m, d))
  const day = (date.getUTCDay() + 6) % 7 // måndag = 0
  date.setUTCDate(date.getUTCDate() - day + 3) // veckans torsdag
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3)
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
}

export type CalendarDay = { iso: string; day: number; inMonth: boolean }

/** Månadens veckor, måndag till söndag, med dagar från grannmånaderna. */
export function monthWeeks(y: number, m: number): { week: number; days: CalendarDay[] }[] {
  const first = new Date(Date.UTC(y, m, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(y, m, 1 - offset))
  const weeks: { week: number; days: CalendarDay[] }[] = []
  const cur = new Date(start)
  // Lägg till veckor tills nästa vecka börjar i en annan månad
  do {
    const days: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const cy = cur.getUTCFullYear(), cm = cur.getUTCMonth(), cd = cur.getUTCDate()
      days.push({ iso: toIso(cy, cm, cd), day: cd, inMonth: cm === m })
      cur.setUTCDate(cd + 1)
    }
    const mon = parseIso(days[0].iso)!
    weeks.push({ week: isoWeek(mon.y, mon.m, mon.d), days })
  } while (cur.getUTCMonth() === m)
  return weeks
}

/** Formaterar siffror till HH:MM medan man skriver. */
export function formatTimeTyping(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}

export function isValidTime(v: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(v)
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60
}
