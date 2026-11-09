'use client'

import { useRouter } from '../../lib/nav'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useGetStatsTrainings } from '../../hooks/backend/stats'
import { usePersistentState } from '../../hooks/usePersistentState'
import { rankStyle } from '../../utils/rankColors'
import { Chip, DataTable, FilterRow, Segmented, pct, pctClass, toggle, type Column } from './table'
import { rankIndex } from '../planning/shared'
import type { Filters } from './Statistics'

const TYPES = ['Träning', 'Coerver', 'Extra', 'Målvaktsträning']
/** Samma definition som övriga appen. Annan aktivitet räknas inte i närvaron. */
const ATTENDED = ['Närvarande', 'Närvarande, ej hela', 'Anmäld']
const NOT_COUNTED = 'Annan aktivitet'
const STATUS_COLUMNS: { status: string; label: string }[] = [
  { status: 'Närvarande', label: 'Närv.' },
  { status: 'Närvarande, ej hela', label: 'Ej hela' },
  { status: 'Anmäld', label: 'Anmäld' },
  { status: 'Annan aktivitet', label: 'Annan akt.' },
  { status: 'Kallad', label: 'Kallad' },
  { status: 'Anmäld, kom ej', label: 'Kom ej' },
  { status: 'Ej närvarande', label: 'Ej närv.' },
  { status: 'Ingen status', label: 'Ingen' },
]

type Row = {
  key: string
  kind: 'player' | 'leader'
  id: number
  shortname: string | null
  name: string
  rank: string | null
  status: string | null
  counts: Record<string, number>
  attended: number
  total: number
  held: number
}

export default function TrainingStats({ filters, slot }: { filters: Filters; slot: HTMLElement | null }) {
  const router = useRouter()
  const [who, setWho] = usePersistentState<'player' | 'leader'>('hl-stats-who', 'player')
  const [types, setTypes] = usePersistentState<string[]>('hl-stats-ttypes', ['Träning'])
  const [inactiveLeaders, setInactiveLeaders] = usePersistentState('hl-stats-inactive-leaders', false)
  const q = useGetStatsTrainings()

  useEffect(() => {
    q.trigger({ from: filters.from, to: filters.to }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to])

  const typesKey = types.join(',')
  const rows = useMemo<Row[]>(() => {
    const d = q.data
    if (!d) return []
    const held = d.held.filter((h) => types.includes(h.type)).reduce((a, h) => a + h.n, 0)
    const map = new Map<string, Row>()
    for (const p of d.people) {
      if (p.kind !== who) continue
      map.set(`${p.kind}-${p.id}`, {
        key: `${p.kind}-${p.id}`, kind: p.kind, id: p.id, shortname: p.shortname ?? p.name, name: p.name,
        rank: p.rank, status: p.status, counts: {}, attended: 0, total: 0, held,
      })
    }
    for (const r of d.rows) {
      if (r.kind !== who || !types.includes(r.type)) continue
      const row = map.get(`${r.kind}-${r.id}`)
      if (!row) continue
      row.counts[r.status] = (row.counts[r.status] ?? 0) + r.n
      if (r.status !== NOT_COUNTED) row.total += r.n
      if (ATTENDED.includes(r.status)) row.attended += r.n
    }
    return [...map.values()].filter((r) => {
      if (filters.search && !`${r.shortname} ${r.name}`.toLowerCase().includes(filters.search)) return false
      if (who === 'player') return filters.playerStatuses.includes(r.status ?? '')
      return inactiveLeaders || r.status === 'Aktiv' || r.total > 0
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, who, typesKey, filters.search, filters.playerStatuses, inactiveLeaders])

  const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0)
  const present = STATUS_COLUMNS.filter((c) => rows.some((r) => r.counts[c.status]))
  const held = rows[0]?.held ?? 0
  const totalAttended = sum((r) => r.attended)
  const totalRows = sum((r) => r.total)

  const columns: Column<Row>[] = [
    {
      key: 'name', label: 'Namn', value: (r) => r.shortname,
      render: (r) => (
        <div className="flex min-w-[110px] flex-col">
          <span className="font-medium text-foreground">{r.shortname}</span>
          {r.name && r.name !== r.shortname && <span className="text-[11px] text-muted-foreground">{r.name}</span>}
        </div>
      ),
    },
    ...(who === 'player'
      ? [{
          key: 'rank', label: 'Nivå', value: (r: Row) => rankIndex(r.rank),
          render: (r: Row) => r.rank ? <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={rankStyle(r.rank)}>{r.rank}</span> : '–',
          firstDir: 'asc' as const,
        }]
      : []),
    { key: 'status', label: 'Status', className: 'hidden sm:table-cell', value: (r) => r.status, render: (r) => <span className="text-xs text-muted-foreground">{r.status ?? '–'}</span> },
    {
      key: 'pct', label: 'Närvaro', align: 'right', title: 'Närvarande, ej hela, anmäld och annan aktivitet, av spelarens alla träningar',
      value: (r) => pct(r.attended, r.total),
      render: (r) => {
        const p = pct(r.attended, r.total)
        return <span className={`font-semibold ${pctClass(p)}`}>{p == null ? '–' : `${p}%`}</span>
      },
      total: <span className={pctClass(pct(totalAttended, totalRows))}>{pct(totalAttended, totalRows) ?? '–'}{totalRows ? '%' : ''}</span>,
    },
    {
      key: 'attended', label: 'Närv. tot', align: 'right', title: 'Antal träningar räknade som närvaro',
      value: (r) => r.attended, total: totalAttended,
    },
    ...present.map<Column<Row>>((c) => ({
      key: `s-${c.status}`, label: c.label, title: c.status, align: 'right',
      value: (r) => r.counts[c.status] ?? 0,
      render: (r) => r.counts[c.status] ? r.counts[c.status] : <span className="text-muted-foreground/50">0</span>,
      total: sum((r) => r.counts[c.status] ?? 0),
    })),
    { key: 'total', label: 'Totalt', align: 'right', title: 'Träningar personen var inbjuden till eller registrerad på (Annan aktivitet räknas inte)', value: (r) => r.total, total: totalRows },
    {
      key: 'ofheld', label: 'Av alla', align: 'right', title: `Närvaro av alla ${held} genomförda träningar i perioden`,
      value: (r) => pct(r.attended, r.held),
      render: (r) => <span className="text-muted-foreground">{pct(r.attended, r.held) ?? '–'}{r.held ? '%' : ''}</span>,
      total: <span className="text-muted-foreground">{held} hållna</span>,
    },
  ]

  return (
    <>
      {slot && createPortal(
        <>
          <FilterRow label="Visa">
            <Segmented<'player' | 'leader'> value={who} onChange={setWho} options={[{ value: 'player', label: 'Spelare' }, { value: 'leader', label: 'Ledare' }]} />
            {who === 'leader' && (
              <Chip on={inactiveLeaders} onClick={() => setInactiveLeaders(!inactiveLeaders)}>Visa inaktiva ledare</Chip>
            )}
          </FilterRow>
          <FilterRow label="Träningstyp">
            {TYPES.map((t) => (
              <Chip key={t} on={types.includes(t)} onClick={() => setTypes(toggle(types, t))}>{t}</Chip>
            ))}
          </FilterRow>
        </>,
        slot,
      )}
      <section className={`overflow-hidden rounded-xl border border-border bg-card ${q.loading ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">{who === 'player' ? 'Spelare' : 'Ledare'} · {rows.length} st</h2>
          <span className="text-xs text-muted-foreground">{held} genomförda träningar ({types.join(', ') || 'ingen typ vald'})</span>
        </div>
        {!q.data ? (
          <div className="h-64 animate-pulse bg-muted/50" />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            initialSort={{ key: 'pct', dir: 'desc' }}
            rowKey={(r) => r.key}
            onRowClick={who === 'player' ? (r) => router.push(`/players/${r.id}`) : undefined}
            empty="Inga träningar under perioden."
          />
        )}
      </section>
    </>
  )
}
