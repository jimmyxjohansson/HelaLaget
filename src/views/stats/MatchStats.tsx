'use client'

import { useRouter } from '../../lib/nav'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useGetStatsMatches } from '../../hooks/backend/stats'
import { usePersistentState } from '../../hooks/usePersistentState'
import { rankStyle } from '../../utils/rankColors'
import { rankIndex } from '../planning/shared'
import { Chip, DataTable, FilterRow, LEVEL_ORDER, Segmented, TYPE_ORDER, orderBy, pct, toggle, type Column } from './table'
import type { Filters } from './Statistics'

export type MatchData = NonNullable<ReturnType<typeof useGetStatsMatches>['data']>

/** Filter på matchtyp och nivå, delat mellan Matcher och Mål & assist. */
export function useMatchFilters() {
  const [typesOff, setTypesOff] = usePersistentState<string[]>('hl-stats-types-off', [])
  const [levelsOff, setLevelsOff] = usePersistentState<string[]>('hl-stats-levels-off', [])
  return { typesOff, setTypesOff, levelsOff, setLevelsOff }
}

export function MatchFilterRows({ data, f }: { data: MatchData | null | undefined; f: ReturnType<typeof useMatchFilters> }) {
  const types = [...new Set([...(data?.held.map((h) => h.matchtype) ?? []), ...TYPE_ORDER.slice(0, 3)])].sort(orderBy(TYPE_ORDER))
  const levels = [...new Set(data?.held.map((h) => h.level) ?? [])].sort(orderBy(LEVEL_ORDER))
  return (
    <>
      <FilterRow label="Matchtyp">
        {types.map((t) => (
          <Chip key={t} on={!f.typesOff.includes(t)} onClick={() => f.setTypesOff(toggle(f.typesOff, t))}>{t}</Chip>
        ))}
      </FilterRow>
      {levels.length > 0 && (
        <FilterRow label="Nivå">
          {levels.map((l) => (
            <Chip key={l} on={!f.levelsOff.includes(l)} onClick={() => f.setLevelsOff(toggle(f.levelsOff, l))} title={l === '–' ? 'Matcher utan nivå' : undefined}>
              {l === '–' ? 'Ingen nivå' : l}
            </Chip>
          ))}
        </FilterRow>
      )}
    </>
  )
}

export function RankBadge({ rank }: { rank: string | null }) {
  return rank ? <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={rankStyle(rank)}>{rank}</span> : <>–</>
}

export function NameCell({ shortname, name }: { shortname: string | null; name: string }) {
  return (
    <div className="flex min-w-[110px] flex-col">
      <span className="font-medium text-foreground">{shortname ?? name}</span>
      {name && name !== shortname && <span className="text-[11px] text-muted-foreground">{name}</span>}
    </div>
  )
}

type Row = {
  id: number
  shortname: string | null
  name: string
  rank: string | null
  status: string | null
  matches: number
  goalkeeper: number
  goals: number
  assists: number
  saves: number
  by: Record<string, number>
}

/** Summera spelarnas matcher efter filter, uppdelat på matchtyp eller nivå. */
export function aggregate(data: MatchData | null | undefined, filters: Filters, f: ReturnType<typeof useMatchFilters>, groupBy: 'level' | 'type') {
  if (!data) return { rows: [] as Row[], held: {} as Record<string, number>, heldTotal: 0, groups: [] as string[] }
  const ok = (t: string, l: string) => !f.typesOff.includes(t) && !f.levelsOff.includes(l)
  const map = new Map<number, Row>()
  for (const p of data.people) {
    map.set(p.id, { id: p.id, shortname: p.shortname ?? p.name, name: p.name, rank: p.rank, status: p.status, matches: 0, goalkeeper: 0, goals: 0, assists: 0, saves: 0, by: {} })
  }
  for (const r of data.rows) {
    if (!ok(r.matchtype, r.level)) continue
    const row = map.get(r.id)
    if (!row) continue
    const g = groupBy === 'level' ? r.level : r.matchtype
    row.by[g] = (row.by[g] ?? 0) + r.matches
    row.matches += r.matches
    row.goalkeeper += r.goalkeeper
    row.goals += r.goals
    row.assists += r.assists
    row.saves += r.saves
  }
  const held: Record<string, number> = {}
  let heldTotal = 0
  for (const h of data.held) {
    if (!ok(h.matchtype, h.level)) continue
    const g = groupBy === 'level' ? h.level : h.matchtype
    held[g] = (held[g] ?? 0) + h.n
    heldTotal += h.n
  }
  const groups = Object.keys(held).sort(orderBy(groupBy === 'level' ? LEVEL_ORDER : TYPE_ORDER))
  const rows = [...map.values()].filter((r) => {
    if (filters.search && !`${r.shortname} ${r.name}`.toLowerCase().includes(filters.search)) return false
    return filters.playerStatuses.includes(r.status ?? '') || r.matches > 0 && !r.status
  })
  return { rows, held, heldTotal, groups }
}

export default function MatchStats({ filters, slot }: { filters: Filters; slot: HTMLElement | null }) {
  const router = useRouter()
  const f = useMatchFilters()
  const [groupBy, setGroupBy] = usePersistentState<'level' | 'type'>('hl-stats-groupby', 'level')
  const q = useGetStatsMatches()

  useEffect(() => {
    q.trigger({ from: filters.from, to: filters.to }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to])

  const { rows, held, heldTotal, groups } = useMemo(
    () => aggregate(q.data, filters, f, groupBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data, filters.search, filters.playerStatuses, f.typesOff, f.levelsOff, groupBy],
  )

  const columns: Column<Row>[] = [
    { key: 'name', label: 'Namn', value: (r) => r.shortname, render: (r) => <NameCell shortname={r.shortname} name={r.name} /> },
    { key: 'rank', label: 'Nivå', value: (r) => rankIndex(r.rank), render: (r) => <RankBadge rank={r.rank} /> },
    { key: 'status', label: 'Status', className: 'hidden sm:table-cell', value: (r) => r.status, render: (r) => <span className="text-xs text-muted-foreground">{r.status ?? '–'}</span> },
    {
      key: 'matches', label: 'Matcher', align: 'right', value: (r) => r.matches,
      render: (r) => <span className="font-semibold">{r.matches}</span>, total: `${heldTotal} st`,
    },
    {
      key: 'share', label: 'Andel', align: 'right', title: 'Andel av lagets spelade matcher (med valda filter)',
      value: (r) => pct(r.matches, heldTotal),
      render: (r) => <ShareBar p={pct(r.matches, heldTotal)} />,
    },
    ...groups.map<Column<Row>>((g) => ({
      key: `g-${g}`, label: g === '–' ? 'Ingen' : g, align: 'right',
      title: `${groupBy === 'level' ? (g === '–' ? 'Matcher utan nivå' : `Nivå ${g}`) : g} – laget har spelat ${held[g]}`,
      value: (r) => r.by[g] ?? 0,
      render: (r) => r.by[g] ? r.by[g] : <span className="text-muted-foreground/50">0</span>,
      total: held[g],
    })),
    {
      key: 'gk', label: 'MV', align: 'right', title: 'Matcher som målvakt', value: (r) => r.goalkeeper,
      render: (r) => r.goalkeeper ? r.goalkeeper : <span className="text-muted-foreground/50">0</span>, total: '',
    },
  ]

  return (
    <>
      {slot && createPortal(
        <>
          <FilterRow label="Kolumner">
            <Segmented<'level' | 'type'> value={groupBy} onChange={setGroupBy} options={[{ value: 'level', label: 'Per nivå' }, { value: 'type', label: 'Per matchtyp' }]} />
          </FilterRow>
          <MatchFilterRows data={q.data} f={f} />
        </>,
        slot,
      )}
      <section className={`overflow-hidden rounded-xl border border-border bg-card ${q.loading ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Spelade matcher · {rows.length} spelare</h2>
          <span className="text-xs text-muted-foreground">Laget har spelat {heldTotal} matcher</span>
        </div>
        {!q.data ? (
          <div className="h-64 animate-pulse bg-muted/50" />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            initialSort={{ key: 'matches', dir: 'desc' }}
            rowKey={(r) => r.id}
            onRowClick={(r) => router.push(`/players/${r.id}`)}
            footerLabel="Lagets matcher"
            empty="Inga spelade matcher under perioden."
          />
        )}
      </section>
    </>
  )
}

function ShareBar({ p }: { p: number | null }) {
  if (p == null) return <span className="text-muted-foreground">–</span>
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:inline-block">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
      </span>
      <span className="w-9 text-right text-muted-foreground">{p}%</span>
    </span>
  )
}
