'use client'

import Link from '../../lib/nav'
import { useMemo, useState } from 'react'
import { CalendarDays, MessageSquare, Shield, Trophy, User, Users } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import { rankStyle } from '../../utils/rankColors'
import { trainingTypeColor } from '../../utils/trainingTypeColor'
import { usePersistentState } from '../../hooks/usePersistentState'
import type getPlayerStats from '../../server/functions/players/getPlayerStats'

export type PlayerStatsData = Awaited<ReturnType<typeof getPlayerStats>>
type Training = PlayerStatsData['trainings'][number]
type Match = PlayerStatsData['matches'][number]

const TABS = [
  { key: 'training', label: 'Träning', icon: CalendarDays },
  { key: 'matches', label: 'Matcher', icon: Shield },
  { key: 'cups', label: 'Cuper', icon: Trophy },
  { key: 'mates', label: 'Medspelare', icon: Users },
] as const
type Tab = (typeof TABS)[number]['key']

const FALLBACK_LOGO = '/icons/icon-192.png'

/** Färger för träningsstatus (samma som i närvarolistan). */
const STATUS_HEX: Record<string, string> = {
  Närvarande: '#16a34a',
  'Närvarande, ej hela': '#4ade80',
  Anmäld: '#2563eb',
  'Annan aktivitet': '#69A969',
  Kallad: '#9333ea',
  'Anmäld, kom ej': '#f59e0b',
  'Ej närvarande': '#dc2626',
}
const STATUS_ORDER = ['Närvarande', 'Närvarande, ej hela', 'Anmäld', 'Annan aktivitet', 'Kallad', 'Anmäld, kom ej', 'Ej närvarande']
const LEVEL_ORDER = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X']

const WEEKDAY = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör']
/** Tider sparas som väggklocka i UTC: läs dem som UTC. */
function day(value: string | null) {
  if (!value) return '–'
  const d = new Date(value)
  return `${WEEKDAY[d.getUTCDay()]} ${d.toISOString().slice(0, 10)}`
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0
}

function outcome(m: Pick<Match, 'ourgoals' | 'theirgoals'>) {
  return m.ourgoals > m.theirgoals ? 'V' : m.ourgoals < m.theirgoals ? 'F' : 'O'
}
const OUTCOME_CLASS = { V: 'bg-emerald-500', O: 'bg-amber-500', F: 'bg-red-500' } as const

function sum<T>(rows: T[], f: (r: T) => number) {
  return rows.reduce((a, r) => a + f(r), 0)
}

function LevelChip({ level }: { level: string | null }) {
  if (!level) return <span className="text-xs text-muted-foreground">–</span>
  return (
    <span className="inline-flex min-w-[1.75rem] justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold" style={rankStyle(level)}>
      {level}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
}

function Card({ title, right, children, className }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-border bg-card', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

/** Summeringen överst: närvaro, matcher, mål, assist, räddningar, cuper. */
export function StatsSummary({ data, loading }: { data: PlayerStatsData | null | undefined; loading: boolean }) {
  const counted = data?.trainings.filter((t) => t.counted) ?? []
  const attended = counted.filter((t) => t.attended).length
  const matches = data?.matches ?? []
  const saves = sum(matches, (m) => m.saves)
  const tiles = [
    { label: 'Närvaro', value: counted.length ? `${pct(attended, counted.length)}%` : '–', sub: `${attended} av ${counted.length}`, tone: tone(pct(attended, counted.length), counted.length) },
    { label: 'Matcher', value: String(matches.length), sub: record(matches) },
    { label: 'Mål', value: String(sum(matches, (m) => m.goals)), sub: perMatch(sum(matches, (m) => m.goals), matches.length) },
    { label: 'Assist', value: String(sum(matches, (m) => m.assists)), sub: perMatch(sum(matches, (m) => m.assists), matches.length) },
    ...(saves > 0 ? [{ label: 'Räddningar', value: String(saves), sub: perMatch(saves, matches.length) }] : []),
    { label: 'Cuper', value: String(data?.cups.length ?? 0), sub: `${sum(data?.cups ?? [], (c) => c.matches)} cupmatcher` },
  ]
  return (
    <div
      className={cn('grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border sm:[grid-template-columns:repeat(var(--tiles),minmax(0,1fr))]', loading && 'opacity-60')}
      style={{ '--tiles': tiles.length } as React.CSSProperties}
    >
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col items-center bg-card px-1 py-3">
          <span className={cn('text-2xl font-bold tabular-nums text-foreground', 'tone' in t && t.tone)}>{t.value}</span>
          <span className="text-xs font-medium text-foreground">{t.label}</span>
          <span className="text-[11px] text-muted-foreground">{t.sub}</span>
        </div>
      ))}
      {/* Fyll ut sista raden på mobilen */}
      {Array.from({ length: (3 - (tiles.length % 3)) % 3 }, (_, i) => (
        <div key={`fill-${i}`} className="bg-card sm:hidden" />
      ))}
    </div>
  )
}

function tone(p: number, total: number) {
  if (!total) return ''
  if (p >= 75) return 'text-green-600 dark:text-green-400'
  if (p >= 50) return 'text-orange-500'
  return 'text-red-500'
}
function perMatch(n: number, matches: number) {
  return matches ? `${(n / matches).toLocaleString('sv-SE', { maximumFractionDigits: 2 })}/match` : '–'
}
function record(matches: Match[]) {
  const c = { V: 0, O: 0, F: 0 }
  for (const m of matches) c[outcome(m)]++
  return `${c.V}V ${c.O}O ${c.F}F`
}

export default function PlayerStats({ data, loading }: { data: PlayerStatsData | null | undefined; loading: boolean }) {
  const [tab, setTab] = usePersistentState<Tab>('hl-player-tab', 'training')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cn('flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium',
              tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            <Icon className="hidden h-4 w-4 sm:block" />{label}
          </button>
        ))}
      </div>
      {!data ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className={cn('flex flex-col gap-3', loading && 'opacity-60')}>
          {tab === 'training' && <TrainingTab trainings={data.trainings} />}
          {tab === 'matches' && <MatchesTab matches={data.matches} />}
          {tab === 'cups' && <CupsTab cups={data.cups} />}
          {tab === 'mates' && <MatesTab mates={data.teammates} total={data.matches.length} />}
        </div>
      )}
    </div>
  )
}

/* ───────────── Träning ───────────── */

function TrainingTab({ trainings }: { trainings: Training[] }) {
  const [onlyComments, setOnlyComments] = useState(false)
  const counted = trainings.filter((t) => t.counted)
  const byStatus = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of counted) m.set(t.status ?? 'Ingen status', (m.get(t.status ?? 'Ingen status') ?? 0) + 1)
    return [...m.entries()].sort((a, b) => idx(STATUS_ORDER, a[0]) - idx(STATUS_ORDER, b[0]))
  }, [counted])
  const months = useMemo(() => {
    const m = new Map<string, { attended: number; total: number }>()
    for (const t of counted) {
      const k = String(t.date).slice(0, 7)
      const v = m.get(k) ?? { attended: 0, total: 0 }
      v.total++
      if (t.attended) v.attended++
      m.set(k, v)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
  }, [counted])
  // Ej räknade: extrapass (andra typer) och Annan aktivitet
  const other = trainings.filter((t) => !t.counted && t.status === 'Annan aktivitet' && t.type === 'Träning')
  const extra = trainings.filter((t) => !t.counted && !other.includes(t))
  const comments = trainings.filter((t) => t.reason).length
  const list = onlyComments ? trainings.filter((t) => t.reason) : trainings

  if (trainings.length === 0) return <Card><Empty>Inga träningar under perioden.</Empty></Card>

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Närvaro per status" right={<span className="text-xs text-muted-foreground">{counted.length} träningar</span>}>
          <div className="flex flex-col gap-3 p-4">
            {counted.length > 0 && (
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {byStatus.map(([s, n]) => (
                  <div key={s} title={`${s}: ${n}`} style={{ width: `${(n / counted.length) * 100}%`, backgroundColor: STATUS_HEX[s] ?? '#9ca3af' }} />
                ))}
              </div>
            )}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {byStatus.map(([s, n]) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[s] ?? '#9ca3af' }} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{s}</span>
                  <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
            {extra.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Dessutom {extra.length} extrapass ({[...new Set(extra.map((t) => t.type))].join(', ')}), som inte räknas in i närvaron.
              </p>
            )}
            {other.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {other.length} {other.length === 1 ? 'träning' : 'träningar'} med Annan aktivitet räknas inte in i närvaron.
              </p>
            )}
          </div>
        </Card>
        <Card title="Närvaro per månad">
          {months.length === 0 ? <Empty>Inga träningar.</Empty> : (
            <div className="flex h-[150px] items-end gap-1.5 px-4 pb-3 pt-4">
              {months.map(([k, v]) => {
                const p = pct(v.attended, v.total)
                return (
                  <div key={k} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${k}: ${v.attended} av ${v.total}`}>
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{p}%</span>
                    <div className="w-full max-w-[36px] rounded-t bg-muted" style={{ height: '100%', position: 'relative' }}>
                      <div className={cn('absolute bottom-0 w-full rounded-t', p >= 75 ? 'bg-green-500' : p >= 50 ? 'bg-orange-400' : 'bg-red-500')} style={{ height: `${Math.max(p, 2)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{monthLabel(k)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Alla träningar"
        right={
          <button type="button" onClick={() => setOnlyComments(!onlyComments)} disabled={comments === 0}
            className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50',
              onlyComments ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            <MessageSquare className="h-3.5 w-3.5" /> Med kommentar ({comments})
          </button>
        }
      >
        <ul className="divide-y divide-border">
          {list.map((t) => (
            <li key={t.id}>
              <Link href={`/trainings/${t.id}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[t.status ?? ''] ?? '#d1d5db' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium tabular-nums text-foreground">{day(t.date)}</span>
                    {t.type !== 'Träning' && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: trainingTypeColor(t.type) }}>{t.type}</span>
                    )}
                    {t.group && <span className="text-xs text-muted-foreground">· {t.group}</span>}
                  </div>
                  {t.reason && (
                    <p className="mt-0.5 flex items-start gap-1 text-sm text-foreground/80">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="whitespace-pre-wrap">{t.reason}</span>
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{t.status ?? '–'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

function idx(list: string[], v: string | null) {
  const i = list.indexOf(v ?? '')
  return i < 0 ? 99 : i
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
function monthLabel(k: string) {
  return MONTHS[Number(k.slice(5, 7)) - 1] ?? k
}

/* ───────────── Matcher ───────────── */

function MatchesTab({ matches }: { matches: Match[] }) {
  const levels = useMemo(() => {
    const m = new Map<string, Match[]>()
    for (const x of matches) {
      const k = x.difficulty ?? '–'
      m.set(k, [...(m.get(k) ?? []), x])
    }
    return [...m.entries()].sort((a, b) => idx(LEVEL_ORDER, a[0]) - idx(LEVEL_ORDER, b[0]))
  }, [matches])
  const types = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of matches) m.set(x.matchtype ?? 'Övrigt', (m.get(x.matchtype ?? 'Övrigt') ?? 0) + 1)
    return [...m.entries()]
  }, [matches])
  const hasSaves = matches.some((m) => m.saves > 0)
  const gk = matches.filter((m) => m.goalkeeper).length

  if (matches.length === 0) return <Card><Empty>Inga spelade matcher under perioden.</Empty></Card>

  return (
    <>
      <Card
        title="Matcher per nivå"
        right={<span className="text-xs text-muted-foreground">{types.map(([t, n]) => `${t} ${n}`).join(' · ')}{gk ? ` · Målvakt ${gk}` : ''}</span>}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Nivå</th>
              <th className="px-2 py-2 text-right font-medium">Matcher</th>
              <th className="px-2 py-2 text-right font-medium">Mål</th>
              <th className="px-2 py-2 text-right font-medium">Assist</th>
              {hasSaves && <th className="px-2 py-2 text-right font-medium">Rädd.</th>}
              <th className="px-4 py-2 text-right font-medium">V–O–F</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {levels.map(([level, rows]) => {
              const r = { V: 0, O: 0, F: 0 }
              for (const m of rows) r[outcome(m)]++
              return (
                <tr key={level}>
                  <td className="px-4 py-2"><LevelChip level={level === '–' ? null : level} /></td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{rows.length}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{sum(rows, (m) => m.goals)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{sum(rows, (m) => m.assists)}</td>
                  {hasSaves && <td className="px-2 py-2 text-right tabular-nums">{sum(rows, (m) => m.saves)}</td>}
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.V}–{r.O}–{r.F}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card title="Spelade matcher">
        <ul className="divide-y divide-border">
          {matches.map((m) => {
            const o = outcome(m)
            const home = m.homeaway !== 'Borta'
            return (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                  <img src={m.opponent_logo ?? FALLBACK_LOGO} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{m.opponent ?? 'Motståndare'}</span>
                      <span className="text-xs text-muted-foreground">{home ? 'H' : 'B'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span className="tabular-nums">{day(m.date)}</span>
                      <span>· {m.cup_name ?? m.matchtype}</span>
                      {m.goalkeeper && <span className="rounded bg-muted px-1 font-semibold text-foreground">MV</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Contributions m={m} />
                    <LevelChip level={m.difficulty} />
                    <span className={cn('flex h-6 min-w-[3.25rem] items-center justify-center gap-1 rounded px-1.5 text-xs font-bold tabular-nums text-white', OUTCOME_CLASS[o])}>
                      {m.ourgoals}–{m.theirgoals}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}

function Contributions({ m }: { m: Match }) {
  const parts = [
    m.goals ? { k: 'g', text: `${m.goals} mål`, cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' } : null,
    m.assists ? { k: 'a', text: `${m.assists} ass`, cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' } : null,
    m.saves ? { k: 's', text: `${m.saves} rädd`, cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300' } : null,
  ].filter((p): p is { k: string; text: string; cls: string } => !!p)
  if (parts.length === 0) return null
  return (
    <span className="hidden gap-1 min-[400px]:flex">
      {parts.map((p) => (
        <span key={p.k} className={cn('whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold', p.cls)}>{p.text}</span>
      ))}
    </span>
  )
}

/* ───────────── Cuper ───────────── */

function CupsTab({ cups }: { cups: PlayerStatsData['cups'] }) {
  if (cups.length === 0) return <Card><Empty>Inga cuper under perioden.</Empty></Card>
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cups.map((c) => (
        <Link key={c.id} href={`/cups/${c.id}`} className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate font-semibold text-foreground">{c.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.startdate ?? '–'}{c.enddate && c.enddate !== c.startdate ? ` – ${c.enddate}` : ''}{c.location ? ` · ${c.location}` : ''}
              </p>
            </div>
            <LevelChip level={c.difficulty} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[['Matcher', c.matches], ['Mål', c.goals], ['Assist', c.assists], ['Rädd.', c.saves]].map(([l, v]) => (
              <div key={l as string} className="rounded-lg bg-muted/60 py-1.5">
                <div className="text-lg font-bold tabular-nums">{v}</div>
                <div className="text-[11px] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ───────────── Medspelare ───────────── */

function MatesTab({ mates, total }: { mates: PlayerStatsData['teammates']; total: number }) {
  const [showAll, setShowAll] = useState(false)
  if (mates.length === 0) return <Card><Empty>Inga spelade matcher under perioden.</Empty></Card>
  const list = showAll ? mates : mates.slice(0, 15)
  return (
    <Card title="Matcher tillsammans med" right={<span className="text-xs text-muted-foreground">av {total} spelade</span>}>
      <ul className="divide-y divide-border">
        {list.map((p) => (
          <li key={p.id}>
            <Link href={`/players/${p.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50">
              {p.img ? (
                <img src={p.img} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"><User className="h-4 w-4 text-muted-foreground" /></span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{p.shortname ?? `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim()}</span>
                  {p.rank && <LevelChip level={p.rank} />}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct(p.matches, total)}%` }} />
                </div>
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">{p.matches}</span>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct(p.matches, total)}%</span>
            </Link>
          </li>
        ))}
      </ul>
      {mates.length > 15 && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="w-full border-t border-border py-2 text-sm font-medium text-primary hover:bg-muted/50">
          {showAll ? 'Visa färre' : `Visa alla ${mates.length}`}
        </button>
      )}
    </Card>
  )
}
