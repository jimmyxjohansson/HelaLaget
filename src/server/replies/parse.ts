/**
 * Tolkar raderna som bokmärket läser från en aktivitet på Svenskalag. Varje rad
 * är textbitarna i raden (namn, roll, tid, kommentar, märken) i sidans ordning.
 */

export type ListKey = 'attending' | 'notattending' | 'invited'

export type ParsedReply = {
  list: ListKey
  name: string
  /** Ledare enligt Svenskalag (t.ex. "| Tränare") */
  leaderRole: boolean
  comment: string | null
  /** Svarstiden som den stod, t.ex. "31 okt, 17:33" */
  answered: string | null
  /** Datum (MM-DD) och klockslag för svaret, om de gick att läsa */
  answeredDay: string | null
  answeredTime: string | null
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
}

const IGNORE = new Set([
  'kallad', 'kallade', 'kommer', 'kan ej', 'kan inte', 'namn', 'anmäld', 'anmälda', 'svarat', 'svar',
  'ej svarat', 'avböjt', 'deltar', 'deltar ej', 'ta bort', 'kommer ej',
])

// Roller, ibland med lagets namn före: "| Tränare", "| P-14 Tränare", "FP-20 Ledare"
const ROLE = /^(\|\s*)?([\p{L}\d][\p{L}\d\-/]{0,15}\s+){0,2}(huvud)?(tränare|ledare|lagledare|assisterande tränare|assisterande|materialare|materialansvarig|målvaktstränare|ansvarig|förälder|lagförälder|coach)$/iu
const WHEN = /^(idag|i dag|igår|i går|(\d{1,2})\s+([a-zåäö]{3})[a-zåäö]*\.?)(,?\s*(kl\.?\s*)?(\d{1,2})[:.](\d{2}))?$/i

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** "31 okt, 17:33" → { day: '10-31', time: '17:33' }. "Idag"/"Igår" räknas från today (MM-DD). */
export function parseWhen(text: string, today: Date): { day: string | null; time: string | null } | null {
  const m = text.trim().match(WHEN)
  if (!m) return null
  let day: string | null = null
  const word = m[1].toLowerCase().replace(' ', '')
  if (word === 'idag' || word === 'igår') {
    const d = new Date(today)
    if (word === 'igår') d.setUTCDate(d.getUTCDate() - 1)
    day = `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  } else if (m[2] && m[3] && MONTHS[m[3].toLowerCase()]) {
    day = `${pad(MONTHS[m[3].toLowerCase()])}-${pad(Number(m[2]))}`
  }
  const time = m[6] ? `${pad(Number(m[6]))}:${m[7]}` : null
  return { day, time }
}

/**
 * Samma person en gång till, t.ex. i en dold utskriftsversion av raden eller förkortat
 * ("Adrian Svensson" och "Adrian S."). Ska inte bli en kommentar.
 */
function sameName(s: string, name: string) {
  const a = nameKey(s).replace(/\./g, '').split(' ')
  const b = nameKey(name).replace(/\./g, '').split(' ')
  if (a.length > 3 || a[0] !== b[0]) return false
  return a.every((w, i) => i === 0 || (b[i] !== undefined && (b[i].startsWith(w) || w.startsWith(b[i]))))
}

function looksLikeName(s: string) {
  return /^[\p{L}][\p{L}'’\-. ]{1,60}$/u.test(s) && /\p{L}{2,}/u.test(s)
}

/** Läser en rad. Ger null för rubrikrader och rader utan namn. */
export function parseRow(list: ListKey, segments: string[], today: Date): ParsedReply | null {
  let name: string | null = null
  let leaderRole = false
  let answered: string | null = null
  let answeredDay: string | null = null
  let answeredTime: string | null = null
  const rest: string[] = []

  for (const raw of segments) {
    // Emojis och liknande tecken (t.ex. i namn) tas bort
    let s = raw.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim()
    if (!s) continue
    // "Jimmy Johansson | Tränare" i en och samma bit
    if (!name && s.includes('|')) {
      const [a, ...b] = s.split('|')
      const role = b.join('|').trim()
      if (looksLikeName(a.trim()) && (!role || ROLE.test(role))) {
        name = a.trim()
        if (role) leaderRole = true
        continue
      }
    }
    if (s === '|') continue
    // Telefonnummer (finns dolda för utskrift på Svenskalag) ska aldrig följa med
    if (/^[\d\s+()\-,]{6,}$/.test(s)) continue
    // Tröjnummer (matcher och cuper visar t.ex. "58." vid namnet) är ingen kommentar
    if (/^#?\d{1,3}\.?$/.test(s)) continue
    if (ROLE.test(s)) { leaderRole = true; continue }
    // "Namn | P-14 Tränare" igen efter namnet: rollen gör personen till ledare, namnet hoppas över
    if (name && s.includes('|')) {
      const [a, ...b] = s.split('|')
      const role = b.join('|').trim()
      if ((!a.trim() || sameName(a.trim(), name)) && (!role || ROLE.test(role))) {
        if (role) leaderRole = true
        continue
      }
    }
    if (name && looksLikeName(s) && sameName(s, name)) continue
    if (IGNORE.has(s.toLowerCase())) continue
    const when = parseWhen(s, today)
    if (when && !answered) {
      answered = s
      answeredDay = when.day
      answeredTime = when.time
      continue
    }
    if (!name && looksLikeName(s)) { name = s; continue }
    s = s.replace(/^["“”']|["“”']$/g, '').trim()
    if (s) rest.push(s)
  }
  if (!name) return null
  // En kommentar utan bokstäver eller siffror (".", "-", mellanslag) räknas som ingen kommentar
  const joined = rest.join(' ').trim()
  const comment = /[\p{L}\d]/u.test(joined) ? joined : null
  return { list, name, leaderRole, comment, answered, answeredDay, answeredTime }
}

export function parseLists(lists: Partial<Record<ListKey, string[][] | null>>, today: Date) {
  const out: ParsedReply[] = []
  const seen = new Set<string>()
  for (const list of ['attending', 'notattending', 'invited'] as ListKey[]) {
    for (const segs of lists[list] ?? []) {
      if (!Array.isArray(segs)) continue
      const r = parseRow(list, segs.map(String).slice(0, 20), today)
      if (!r) continue
      const key = `${list}|${nameKey(r.name)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(r)
    }
  }
  return out
}

/** Jämförbar form av ett namn: små bokstäver, enkla mellanslag. */
export function nameKey(name: string) {
  return name.toLowerCase().normalize('NFC').replace(/[’']/g, '').replace(/\s+/g, ' ').trim()
}
