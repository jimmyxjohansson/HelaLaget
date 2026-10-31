'use client'

import { CheckCircle, Clock, HelpCircle, Lightbulb, Send, XCircle } from 'lucide-react'

export type Kind = 'match' | 'cup'

/** Svar på kallelsen, i den ordning knapparna visas. */
export const ANSWERS = [
  { value: 'Förslag', hex: '#D97706', icon: Lightbulb },
  { value: 'Inbjuden', hex: '#2563EB', icon: Send },
  { value: 'Kommer', hex: '#15803D', icon: CheckCircle },
  { value: 'Nekat', hex: '#DC2626', icon: XCircle },
  { value: 'Ej svarat', hex: '#6B7280', icon: HelpCircle },
  { value: 'Reserv', hex: '#9333EA', icon: Clock },
] as const

export function answerHex(status: string | null | undefined) {
  return ANSWERS.find((a) => a.value === status)?.hex ?? '#6B7280'
}

export const EVENT_STATUSES: Record<Kind, string[]> = {
  match: ['Ny', 'Förslag', 'Kallad', 'Registrerad i Fogis', 'Avslutad', '-'],
  cup: ['Ny', 'Förslag', 'Kallad', 'Avslutad', '-'],
}

export const PLAYER_STATUSES = ['Aktiv', 'Aktiv, ej matchklar', 'Provspelare', 'Gästspelare', 'Vilande', 'Slutat']

export const PERIODS = [
  { months: 1, label: '1 mån' },
  { months: 2, label: '2 mån' },
  { months: 3, label: '3 mån' },
  { months: 6, label: '6 mån' },
  { months: 12, label: '1 år' },
  { months: 0, label: 'Alla' },
]

/** Startdatum för närvaroperioden, eller null för alla. */
export function periodFrom(months: number): string | null {
  if (!months) return null
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
}

/** Tider sparas som väggklocka i UTC: "tis 3 nov 17:30". */
export function formatWhen(iso: string | null | undefined, withTime = true) {
  if (!iso) return ''
  const d = new Date(iso)
  const date = d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (!withTime) return date
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  return time === '00:00' ? date : `${date} ${time}`
}

export function formatCupDates(start: string | null, end: string | null) {
  if (!start) return ''
  const a = formatWhen(start, false)
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return a
  return `${a} – ${formatWhen(end, false)}`
}

export function percent(coming: number, total: number) {
  return total > 0 ? Math.round((coming / total) * 100) : null
}

/** Färg för närvaroprocent: grön ≥ 75, gul ≥ 50, annars röd. */
export function percentClass(p: number | null) {
  if (p == null) return 'text-muted-foreground'
  return p >= 75 ? 'text-green-700 dark:text-green-400' : p >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
}

/** Antal per svar, i samma färger överallt. */
export function Counts({ c }: { c: { coming: number; declined: number; invited: number; proposed: number; reserve?: number } }) {
  const items = [
    { n: c.coming, label: 'kommer', hex: answerHex('Kommer') },
    { n: c.declined, label: 'nekat/ej svarat', hex: answerHex('Nekat') },
    { n: c.invited, label: 'inbjudna', hex: answerHex('Inbjuden') },
    { n: c.proposed, label: 'förslag', hex: answerHex('Förslag') },
  ]
  if (c.reserve) items.push({ n: c.reserve, label: 'reserv', hex: answerHex('Reserv') })
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      {items.map((i) => (
        <span key={i.label} title={i.label} className="font-semibold" style={{ color: i.hex }}>
          {i.n}
        </span>
      ))}
    </span>
  )
}

// ── Sortering av listorna ────────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc'
export type SortState<K extends string> = { key: K; dir: SortDir } | null

const RANK_ORDER: Record<string, number> = { A: 0, AB: 1, B: 2, BC: 3, C: 4, CD: 5, D: 6, X: 7 }
const ANSWER_ORDER: Record<string, number> = { Kommer: 0, Inbjuden: 1, Förslag: 2, Reserv: 3, 'Ej svarat': 4, Nekat: 5 }

export const rankIndex = (r: string | null | undefined) => (r ? RANK_ORDER[r.toUpperCase()] ?? 98 : 99)
export const answerIndex = (s: string | null | undefined) => (s ? ANSWER_ORDER[s] ?? 98 : 99)

/** Klick på samma kolumn: stigande → fallande → ingen sortering. */
export function nextSort<K extends string>(prev: SortState<K>, key: K, firstDir: SortDir = 'asc'): SortState<K> {
  if (!prev || prev.key !== key) return { key, dir: firstDir }
  if (prev.dir === firstDir) return { key, dir: firstDir === 'asc' ? 'desc' : 'asc' }
  return null
}

/** Sortera en kopia. Saknade värden hamnar alltid sist; lika värden sorteras på namn. */
export function sortRows<T extends { shortname: string | null }, K extends string>(
  rows: T[],
  sort: SortState<K>,
  value: (row: T, key: K) => number | string | null,
): T[] {
  if (!sort) return rows
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = value(a, sort.key)
    const vb = value(b, sort.key)
    if (va == null && vb != null) return 1
    if (vb == null && va != null) return -1
    let cmp = 0
    if (typeof va === 'string' || typeof vb === 'string') cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'sv')
    else cmp = (va as number) - (vb as number)
    if (cmp !== 0) return cmp * dir
    return (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv')
  })
}

/** Rubrik som sorterar listan, med pil för aktiv riktning. */
export function SortHead<K extends string>({
  label,
  k,
  sort,
  onSort,
  className,
  title,
  firstDir,
}: {
  label: string
  k: K
  sort: SortState<K>
  onSort: (s: SortState<K>) => void
  className?: string
  title?: string
  firstDir?: SortDir
}) {
  const active = sort?.key === k
  return (
    <button
      type="button"
      title={title ?? `Sortera på ${label.toLowerCase()}`}
      onClick={() => onSort(nextSort(sort, k, firstDir))}
      className={`flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} ${className ?? ''}`}
    >
      <span className="truncate">{label}</span>
      {active ? <span aria-hidden>{sort!.dir === 'asc' ? '▲' : '▼'}</span> : null}
    </button>
  )
}
