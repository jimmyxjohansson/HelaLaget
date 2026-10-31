'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import SquadLogo from '../../components/SquadLogo'
import DatePicker from '../../components/DatePicker'
import { usePersistentState } from '../../hooks/usePersistentState'
import { cn } from '../../lib/shadcn/utils'
import { Chip, FilterRow, Segmented, toggle } from './table'
import TrainingStats from './TrainingStats'
import MatchStats from './MatchStats'
import ScoringStats from './ScoringStats'

export type Tab = 'training' | 'matches' | 'scoring'

/** Filter som gäller alla flikar. */
export type Filters = {
  from: string | null
  to: string | null
  search: string
  playerStatuses: string[]
}

export const PLAYER_STATUSES = ['Aktiv', 'Aktiv, ej matchklar', 'Provspelare', 'Gästspelare', 'Vilande', 'Slutat']

const PERIODS = [
  { key: '1', label: '1 mån' },
  { key: '3', label: '3 mån' },
  { key: '6', label: '6 mån' },
  { key: '12', label: '1 år' },
  { key: 'year', label: 'I år' },
  { key: 'all', label: 'Alla' },
  { key: 'custom', label: 'Eget' },
]

function todayIso() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
}

function periodRange(key: string, customFrom: string | null, customTo: string | null): { from: string | null; to: string | null } {
  if (key === 'all') return { from: null, to: null }
  if (key === 'custom') return { from: customFrom, to: customTo }
  if (key === 'year') return { from: `${todayIso().slice(0, 4)}-01-01`, to: null }
  const d = new Date()
  d.setMonth(d.getMonth() - Number(key))
  return { from: d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }), to: null }
}

/**
 * Statistik för hela laget: träningsnärvaro (spelare och ledare), spelade
 * matcher per typ och nivå samt mål, assist och räddningar.
 */
export default function Statistics() {
  const [tab, setTab] = usePersistentState<Tab>('hl-stats-tab', 'training')
  const [period, setPeriod] = usePersistentState('hl-stats-period', 'year')
  const [customFrom, setCustomFrom] = usePersistentState<string | null>('hl-stats-from', null)
  const [customTo, setCustomTo] = usePersistentState<string | null>('hl-stats-to', null)
  const [playerStatuses, setPlayerStatuses] = usePersistentState<string[]>(
    'hl-stats-pstatus',
    PLAYER_STATUSES.filter((s) => s !== 'Slutat'),
  )
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)

  const { from, to } = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo])
  const filters: Filters = { from, to, search: search.trim().toLowerCase(), playerStatuses }

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-3 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex min-w-0 items-center gap-3">
          <SquadLogo />
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Statistik</h1>
            <p className="text-sm text-team-accent/70">Närvaro, matcher, mål och assist för hela laget</p>
          </div>
        </div>
      </div>

      <div className="z-20 flex flex-col gap-2 border-b border-border bg-background px-4 py-3 md:sticky md:top-0">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'training', label: 'Träning' },
              { value: 'matches', label: 'Matcher' },
              { value: 'scoring', label: 'Mål & assist' },
            ]}
          />
          <div className="relative ml-auto min-w-[160px] flex-1 sm:max-w-[240px] sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök namn"
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className={cn('flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm md:hidden', filtersOpen && 'bg-muted')}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>
        <div className={cn('flex-col gap-2 md:flex', filtersOpen ? 'flex' : 'hidden')}>
          <FilterRow label="Period">
            {PERIODS.map((p) => (
              <Chip key={p.key} on={period === p.key} onClick={() => setPeriod(p.key)}>
                {p.label}
              </Chip>
            ))}
            {period === 'custom' && (
              <span className="flex items-center gap-1.5">
                <DatePicker value={customFrom} onChange={(v) => setCustomFrom(v || null)} placeholder="Från" className="h-8 w-[130px] text-xs" />
                <span className="text-xs text-muted-foreground">–</span>
                <DatePicker value={customTo} onChange={(v) => setCustomTo(v || null)} placeholder="Till i dag" className="h-8 w-[130px] text-xs" />
              </span>
            )}
          </FilterRow>
          <FilterRow label="Spelarstatus">
            {PLAYER_STATUSES.map((s) => (
              <Chip key={s} on={playerStatuses.includes(s)} onClick={() => setPlayerStatuses(toggle(playerStatuses, s))}>
                {s}
              </Chip>
            ))}
          </FilterRow>
          {/* Flikens egna filter hamnar här */}
          <div ref={setSlot} className="flex flex-col gap-2" />
        </div>
      </div>

      <div className="p-3 md:p-4">
        {tab === 'training' && <TrainingStats filters={filters} slot={slot} />}
        {tab === 'matches' && <MatchStats filters={filters} slot={slot} />}
        {tab === 'scoring' && <ScoringStats filters={filters} slot={slot} />}
      </div>
    </div>
  )
}
