// Minimal iCalendar-tolk för Svenskalags kalenderflöden (VEVENT med TZID, datum och UTC-tider).

export type IcalEvent = {
  uid: string
  summary: string
  description: string
  location: string
  /** Lokal väggklocka som 'ÅÅÅÅ-MM-DDTHH:MM' (Europe/Stockholm). */
  start: string
  end: string | null
  status: string
}

export type IcalCalendar = {
  name: string
  events: IcalEvent[]
}

/** Avkoda iCal-text (\n, \, \; \\). */
function unescapeText(v: string) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')
}

const pad = (n: number) => String(n).padStart(2, '0')

/** UTC-tid → väggklocka i Stockholm. */
function utcToStockholm(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}`
}

/** DTSTART/DTEND → 'ÅÅÅÅ-MM-DDTHH:MM' i lokal tid. */
export function parseIcalDate(params: string, value: string): string | null {
  const v = value.trim()
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(v) // heldag (VALUE=DATE)
  if (m) return `${m[1]}-${m[2]}-${m[3]}T00:00`
  m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(v)
  if (!m) return null
  if (m[7] === 'Z') {
    return utcToStockholm(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0))))
  }
  // TZID=Europe/Stockholm eller flytande tid: redan lokal väggklocka
  void params
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`
}

export function parseIcal(text: string): IcalCalendar {
  // Radbrytning: CRLF/LF, och fortsättningsrader börjar med mellanslag eller tabb
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
  const lines = unfolded.split('\n')
  const events: IcalEvent[] = []
  let name = ''
  let current: Record<string, { params: string; value: string }> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (current?.UID && current.DTSTART) {
        const start = parseIcalDate(current.DTSTART.params, current.DTSTART.value)
        if (start) {
          events.push({
            uid: current.UID.value.trim(),
            summary: unescapeText(current.SUMMARY?.value ?? '').trim(),
            description: unescapeText(current.DESCRIPTION?.value ?? '').trim(),
            location: unescapeText(current.LOCATION?.value ?? '').trim(),
            start,
            end: current.DTEND ? parseIcalDate(current.DTEND.params, current.DTEND.value) : null,
            status: (current.STATUS?.value ?? '').trim().toUpperCase(),
          })
        }
      }
      current = null
      continue
    }
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const head = line.slice(0, colon)
    const value = line.slice(colon + 1)
    const [key, ...params] = head.split(';')
    if (current) current[key.toUpperCase()] = { params: params.join(';'), value }
    else if (key.toUpperCase() === 'X-WR-CALNAME') name = unescapeText(value).trim()
  }
  return { name, events }
}
