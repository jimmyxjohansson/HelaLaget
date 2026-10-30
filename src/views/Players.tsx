'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGetPlayers } from '../hooks/backend/players'
import { usePersistentState } from '../hooks/usePersistentState'
import { Search, User, Trophy, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import PlayerActions from '../components/PlayerActions'
import { canEdit } from '../lib/squad-store'

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
]

type SortDir = 'asc' | 'desc'
// Natural direction applied when switching to a sort field (before any toggle).
const DEFAULT_SORT_DIR: Record<string, SortDir> = {
  name: 'asc',
  rank: 'asc',
  pct: 'desc',
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

  const filtered = (players ?? [])
    .filter(p => {
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        p.firstname.toLowerCase().includes(q) ||
        p.lastname.toLowerCase().includes(q) ||
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
          <div>
            <h1 className="text-xl font-bold">Spelare</h1>
            <p className="text-team-accent/70 text-sm">{filtered.length} spelare</p>
          </div>
          {canEdit() && <PlayerActions onChanged={() => trigger({ months: timeFilter })} />}
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
              statusFilter.length === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Alla
          </button>
          {STATUS_FILTERS.map(sf => {
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
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Inga spelare hittades</p>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {filtered.map((p, idx) => {
              const attendPct = pct(p.sessions_attended, p.total_sessions)
              return (
                <div key={p.id} onClick={() => router.push(`/players/${p.id}?months=${timeFilter}`)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors active:bg-muted/70">
                  {/* Rank */}
                  {sort === 'pct' && (
                    <div className="w-5 text-center flex-shrink-0">
                      {idx === 0 ? (
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                      )}
                    </div>
                  )}
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.img ? (
                      <img src={p.img} alt={p.shortname} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{p.shortname}</span>
                      {p.rank && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={rankStyle(p.rank)}
                        >
                          {p.rank}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.sessions_attended} av {p.total_sessions}</span>
                      {p.status && p.status !== 'Aktiv' && (
                        <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS_BADGE[p.status] ?? 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                      )}
                    </div>
                  </div>
                  {/* Attendance pct */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${pctColor(attendPct)}`}>{attendPct}%</span>
                      <div className="w-14 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            attendPct >= 75 ? 'bg-green-500' :
                            attendPct >= 50 ? 'bg-orange-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${attendPct}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
