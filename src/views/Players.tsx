'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGetPlayers } from '../hooks/backend/players'
import { usePersistentState } from '../hooks/usePersistentState'
import { Search, User, Trophy, ChevronRight, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import GenderBadge from '../components/GenderBadge'
import { isMixed } from '../utils/gender'
import { rankStyle } from '../utils/rankColors'
import PlayerActions from '../components/PlayerActions'
import { canEdit } from '../lib/squad-store'
import SquadLogo from '../components/SquadLogo'
import { useSquadStatuses } from '../hooks/useSquadStatuses'

interface Player {
  id: number
  firstname: string
  lastname: string
  shortname: string
  number: number
  img: string
  status: string
  defender: boolean
  defensivemidfielder: boolean
  offensivemidfielder: boolean
  winger: boolean
  striker: boolean
  goalkeeper: boolean
  rank: string | null
  sessions_attended: string
  total_sessions: string
  birthdate: string | null
  foot: string | null
  gender: string | null
  shirt_size: string | null
  shorts_size: string | null
  sock_size: string | null
  matches: number
  goals: number
  assists: number
  saves: number
}

const POSITIONS: { key: keyof Player; short: string; label: string }[] = [
  { key: 'goalkeeper', short: 'MV', label: 'Målvakt' },
  { key: 'defender', short: 'B', label: 'Försvarare' },
  { key: 'defensivemidfielder', short: 'DM', label: 'Defensiv mittfältare' },
  { key: 'offensivemidfielder', short: 'OM', label: 'Offensiv mittfältare' },
  { key: 'winger', short: 'Y', label: 'Ytter' },
  { key: 'striker', short: 'A', label: 'Anfallare' },
]

/** Ålder i hela år från födelsedatum (ÅÅÅÅ-MM-DD). */
function age(birthdate: string | null) {
  if (!birthdate) return null
  const [y, m, d] = birthdate.slice(0, 10).split('-').map(Number)
  if (!y) return null
  const now = new Date()
  let a = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--
  return a
}

function Positions({ p, className }: { p: Player; className?: string }) {
  const list = POSITIONS.filter((x) => p[x.key])
  if (list.length === 0) return <span className={cn('text-muted-foreground', className)}>–</span>
  return (
    <span className={cn('inline-flex flex-wrap gap-1', className)}>
      {list.map((x) => (
        <span key={x.short} title={x.label} className="rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary">{x.short}</span>
      ))}
    </span>
  )
}

function pct(attended: string, total: string) {
  const t = Number(total)
  if (!t) return 0
  return Math.round((Number(attended) / t) * 100)
}

function pctColor(n: number) {
  if (n >= 75) return 'text-green-600 dark:text-green-400'
  if (n >= 50) return 'text-orange-500'
  return 'text-red-500'
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Namn' },
  { value: 'rank', label: 'Rank' },
  { value: 'pct', label: 'Närvaro %' },
  { value: 'matches', label: 'Matcher' },
  { value: 'goals', label: 'Mål' },
]

type SortDir = 'asc' | 'desc'
// Natural direction applied when switching to a sort field (before any toggle).
const DEFAULT_SORT_DIR: Record<string, SortDir> = {
  name: 'asc',
  rank: 'asc',
  pct: 'desc',
  number: 'asc',
  age: 'asc',
  matches: 'desc',
  goals: 'desc',
  assists: 'desc',
}

const RANK_ORDER = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X']
function rankIndex(rank: string | null) {
  const i = rank ? RANK_ORDER.indexOf(rank) : -1
  return i === -1 ? RANK_ORDER.length : i
}

const STATUS_FILTERS = [
  { value: 'Aktiv', label: 'Aktiv' },
  { value: 'Aktiv, ej matchklar', label: 'Ej matchklar' },
  { value: 'Vilande', label: 'Vilande' },
  { value: 'Gästspelare', label: 'Gästspelare' },
  { value: 'Slutat', label: 'Slutat' },
]

const TIME_FILTERS = [
  { value: 1,  label: '1 mån' },
  { value: 2,  label: '2 mån' },
  { value: 3,  label: '3 mån' },
  { value: 6,  label: '6 mån' },
  { value: 12, label: '1 år' },
  { value: 0,  label: 'Alla' },
]

const STATUS_BADGE: Record<string, string> = {
  Aktiv: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  'Aktiv, ej matchklar': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  Vilande: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  Gästspelare: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Slutat: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}

export default function Players() {
  const { data, loading, trigger } = useGetPlayers()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sort, setSort] = usePersistentState('players.sort', 'rank')
  const [sortDir, setSortDir] = usePersistentState<SortDir>('players.sortDir', 'asc')
  const [statusFilter, setStatusFilter] = usePersistentState<string[]>('players.statusFilter', ['Aktiv', 'Aktiv, ej matchklar'])
  const [statusRefresh, setStatusRefresh] = useState(0)
  const statusVisible = useSquadStatuses(statusRefresh)
  // Valda statusar som inte finns i laget (t.ex. sparade från ett annat lag) filtrerar inte bort någon
  const activeStatuses = statusFilter.filter((s) => statusVisible(s))

  function toggleStatus(value: string) {
    setStatusFilter(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    )
  }
  const [timeFilter, setTimeFilter] = usePersistentState('players.timeFilter', 2)

  useEffect(() => { trigger({ months: timeFilter }) }, [timeFilter])

  function handleTimeFilter(months: number) {
    setTimeFilter(months)
  }

  // Migrate the legacy persisted sort value from before asc/desc existed.
  useEffect(() => {
    if (sort === 'pct_desc') {
      setSort('pct')
      setSortDir('desc')
    }
  }, [sort])

  function handleSort(field: string) {
    if (sort === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setSortDir(DEFAULT_SORT_DIR[field] ?? 'asc')
    }
  }

  const players = data as unknown as Player[] | undefined
  const editor = canEdit()
  const mixed = isMixed(players ?? [])
  const open = (id: number) => router.push(`/players/${id}?months=${timeFilter}`)
  const edit = (id: number) => router.push(`/players/${id}?months=${timeFilter}&edit=1`)

  const anySaves = (players ?? []).some((p) => p.saves > 0)
  const filtered = (players ?? [])
    .filter(p => {
      if (activeStatuses.length > 0 && !activeStatuses.includes(p.status)) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        p.firstname.toLowerCase().includes(q) ||
        (p.lastname ?? '').toLowerCase().includes(q) ||
        p.shortname.toLowerCase().includes(q) ||
        String(p.number).includes(q)
      )
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sort === 'name') return a.firstname.localeCompare(b.firstname, 'sv') * dir
      if (sort === 'rank') {
        const r = rankIndex(a.rank) - rankIndex(b.rank)
        if (r !== 0) return r * dir
        const p = pct(b.sessions_attended, b.total_sessions) - pct(a.sessions_attended, a.total_sessions)
        if (p !== 0) return p
        return a.firstname.localeCompare(b.firstname, 'sv')
      }
      const num = (f: (p: Player) => number | null) => {
        const va = f(a), vb = f(b)
        if (va == null && vb != null) return 1
        if (vb == null && va != null) return -1
        return ((va ?? 0) - (vb ?? 0)) * dir || a.firstname.localeCompare(b.firstname, 'sv')
      }
      if (sort === 'number') return num((p) => p.number)
      if (sort === 'age') return num((p) => age(p.birthdate))
      if (sort === 'matches') return num((p) => p.matches)
      if (sort === 'goals') return num((p) => p.goals)
      if (sort === 'assists') return num((p) => p.assists)
      if (sort === 'pct') {
        const p = pct(a.sessions_attended, a.total_sessions) - pct(b.sessions_attended, b.total_sessions)
        if (p !== 0) return p * dir
        return a.firstname.localeCompare(b.firstname, 'sv')
      }
      return 0
    })

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <SquadLogo />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Spelare</h1>
              <p className="text-team-accent/70 text-sm">{filtered.length} spelare<span className="hidden sm:inline"> · närvaro och matcher {TIME_FILTERS.find((t) => t.value === timeFilter)?.label === 'Alla' ? 'totalt' : `senaste ${TIME_FILTERS.find((t) => t.value === timeFilter)?.label ?? ''}`}</span></p>
            </div>
          </div>
          {canEdit() && <PlayerActions onChanged={() => { trigger({ months: timeFilter }); setStatusRefresh((n) => n + 1) }} />}
        </div>
      </div>

      {/* Search + sort */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök spelare..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {/* Time filters */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TIME_FILTERS.map(tf => (
            <button
              key={tf.value}
              onClick={() => handleTimeFilter(tf.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                timeFilter === tf.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {/* Status filters (multi-select) */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setStatusFilter([])}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeStatuses.length === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Alla
          </button>
          {STATUS_FILTERS.filter(sf => statusVisible(sf.value)).map(sf => {
            const active = statusFilter.includes(sf.value)
            return (
              <button
                key={sf.value}
                onClick={() => toggleStatus(sf.value)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {sf.label}
              </button>
            )
          })}
        </div>
        {/* Sort options */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {SORT_OPTIONS.map(opt => {
            const active = sort === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => handleSort(opt.value)}
                className={`flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
                {active && (
                  sortDir === 'asc'
                    ? <ArrowUp className="w-3.5 h-3.5" />
                    : <ArrowDown className="w-3.5 h-3.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Player list */}
      <div className="px-4 py-3">
        {loading && !players ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Inga spelare hittades</p>
        ) : (
          <>
            {/* Dator: tabell med fler kolumner */}
            <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <Th label="Nr" field="number" sort={sort} dir={sortDir} onSort={handleSort} className="w-12 pl-4" />
                    <Th label="Spelare" field="name" sort={sort} dir={sortDir} onSort={handleSort} />
                    <Th label="Rank" field="rank" sort={sort} dir={sortDir} onSort={handleSort} />
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <Th label="Ålder" field="age" sort={sort} dir={sortDir} onSort={handleSort} />
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Positioner</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fot</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" title="Tröja · shorts · strumpor">Storlekar</th>
                    <Th label="Närvaro" field="pct" sort={sort} dir={sortDir} onSort={handleSort} align="right" />
                    <Th label="Matcher" field="matches" sort={sort} dir={sortDir} onSort={handleSort} align="right" />
                    <Th label="Mål" field="goals" sort={sort} dir={sortDir} onSort={handleSort} align="right" />
                    <Th label="Assist" field="assists" sort={sort} dir={sortDir} onSort={handleSort} align="right" />
                    {anySaves && <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rädd.</th>}
                    {editor && <th className="w-24 pr-4" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => {
                    const attendPct = pct(p.sessions_attended, p.total_sessions)
                    const a = age(p.birthdate)
                    return (
                      <tr key={p.id} onClick={() => open(p.id)} className="cursor-pointer hover:bg-muted/40">
                        <td className="py-2 pl-4 pr-2 tabular-nums text-muted-foreground">{p.number || '–'}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar p={p} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium">{p.shortname}</span>
                                {mixed && <GenderBadge gender={p.gender} />}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">{p.firstname} {p.lastname}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {p.rank ? <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={rankStyle(p.rank)}>{p.rank}</span> : <span className="text-muted-foreground">–</span>}
                        </td>
                        <td className="px-2 py-2">
                          <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[p.status] ?? 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums" title={p.birthdate ?? undefined}>{a != null ? `${a} år` : '–'}</td>
                        <td className="px-2 py-2"><Positions p={p} /></td>
                        <td className="px-2 py-2 text-muted-foreground">{p.foot || '–'}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-xs tabular-nums text-muted-foreground" title="Tröja · shorts · strumpor">
                          {p.shirt_size || p.shorts_size || p.sock_size ? `${p.shirt_size || '–'} · ${p.shorts_size || '–'} · ${p.sock_size || '–'}` : '–'}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className={`font-semibold tabular-nums ${pctColor(attendPct)}`}>{attendPct}%</span>
                          <span className="block text-[11px] tabular-nums text-muted-foreground">{p.sessions_attended} av {p.total_sessions}</span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{p.matches}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium">{p.goals}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{p.assists}</td>
                        {anySaves && <td className="px-2 py-2 text-right tabular-nums">{p.saves || ''}</td>}
                        {editor && (
                          <td className="py-2 pl-2 pr-4 text-right">
                            <button type="button" onClick={(e) => { e.stopPropagation(); edit(p.id) }}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted">
                              <Pencil className="h-3.5 w-3.5" /> Redigera
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobil: kort med tre rader information */}
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden md:hidden">
              {filtered.map((p, idx) => {
                const attendPct = pct(p.sessions_attended, p.total_sessions)
                const a = age(p.birthdate)
                return (
                  <div key={p.id} onClick={() => open(p.id)} className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-muted/40 transition-colors active:bg-muted/70">
                    {sort === 'pct' && (
                      <div className="w-5 text-center flex-shrink-0">
                        {idx === 0 ? <Trophy className="w-4 h-4 text-yellow-500" /> : <span className="text-xs text-muted-foreground">{idx + 1}</span>}
                      </div>
                    )}
                    <Avatar p={p} big />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">{p.shortname}</span>
                        {p.rank && <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={rankStyle(p.rank)}>{p.rank}</span>}
                        {mixed && <GenderBadge gender={p.gender} />}
                        {p.status && p.status !== 'Aktiv' && (
                          <span className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[p.status] ?? 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{p.firstname} {p.lastname}</span>
                        {a != null && <span>· {a} år</span>}
                        {POSITIONS.some((x) => p[x.key]) && <Positions p={p} />}
                      </div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {p.matches} matcher · {p.goals} mål · {p.assists} ass{p.saves ? ` · ${p.saves} rädd` : ''}
                      </div>
                      {(p.shirt_size || p.shorts_size || p.sock_size) && (
                        <div className="text-[11px] text-muted-foreground">
                          Tröja {p.shirt_size || '–'} · Shorts {p.shorts_size || '–'} · Strumpor {p.sock_size || '–'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <span className="flex flex-col items-end leading-tight">
                        <span className={`text-sm font-bold ${pctColor(attendPct)}`}>{attendPct}%</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{p.sessions_attended}/{p.total_sessions}</span>
                      </span>
                      {editor ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); edit(p.id) }} aria-label={`Redigera ${p.shortname}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Avatar({ p, big }: { p: Player; big?: boolean }) {
  return (
    <div className={cn('relative flex-shrink-0', big ? 'h-10 w-10' : 'h-8 w-8')}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-muted">
        {p.img ? <img src={p.img} alt={p.shortname} className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-muted-foreground" />}
      </div>
      {big && p.number ? (
        <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-card bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">{p.number}</span>
      ) : null}
    </div>
  )
}

function Th({ label, field, sort, dir, onSort, align, className }: {
  label: string; field: string; sort: string; dir: SortDir; onSort: (f: string) => void; align?: 'right'; className?: string
}) {
  const active = sort === field
  return (
    <th className={cn('px-2 py-2', className)}>
      <button type="button" onClick={() => onSort(field)}
        className={cn('flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide', align === 'right' && 'ml-auto',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
        {label}
        {active && (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  )
}
