'use client'

import { useRouter } from '../../lib/nav'
import PersonStatsDialog, { type StatsPerson } from '../player/PersonStatsDialog'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGetStatsEvents, useGetStatsMatches } from '../../hooks/backend/stats'
import { usePersistentState } from '../../hooks/usePersistentState'
import { rankIndex } from '../planning/shared'
import { Chip, DataTable, FilterRow, LEVEL_ORDER, Segmented, toggle, type Column } from './table'
import { MatchFilterRows, NameCell, RankBadge, aggregate, useMatchFilters } from './MatchStats'
import type { Filters } from './Statistics'

type Mode = 'players' | 'events'
const KINDS = ['Mål', 'Assist', 'Räddning'] as const
type Kind = (typeof KINDS)[number]

const KIND_CLASS: Record<Kind, string> = {
  Mål: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  Assist: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
  Räddning: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
}

type EventRow = {
  key: string
  matchId: number
  playerId: number
  shortname: string | null
  name: string
  status: string | null
  kind: Kind
  partner: string | null
  type: string | null
  minute: number | null
  date: string
  opponent: string | null
  cup: string | null
  matchtype: string
  level: string
}

const WEEKDAY = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör']
/** Tider sparas som väggklocka i UTC. */
function day(value: string) {
  const d = new Date(value)
  return `${WEEKDAY[d.getUTCDay()]} ${d.toISOString().slice(0, 10)}`
}

export default function ScoringStats({ filters, slot }: { filters: Filters; slot: HTMLElement | null }) {
  const router = useRouter()
  const [person, setPerson] = useState<StatsPerson | null>(null)
  const f = useMatchFilters()
  const [mode, setMode] = usePersistentState<Mode>('hl-stats-scoring-mode', 'players')
  const [kindsOff, setKindsOff] = usePersistentState<string[]>('hl-stats-kinds-off', [])
  const matches = useGetStatsMatches()
  const events = useGetStatsEvents()

  useEffect(() => {
    matches.trigger({ from: filters.from, to: filters.to }).catch(() => {})
    events.trigger({ from: filters.from, to: filters.to }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to])

  // Per spelare: samma summering som Matcher-fliken, bara de som spelat
  const players = useMemo(
    () => aggregate(matches.data, filters, f, 'level').rows.filter((r) => r.matches > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matches.data, filters.search, filters.playerStatuses, f.typesOff, f.levelsOff],
  )

  // Alla händelser: en rad per spelare och roll (målskytt, assist, räddning)
  const eventRows = useMemo<EventRow[]>(() => {
    const people = new Map((matches.data?.people ?? []).map((p) => [p.id, p]))
    const nameOf = (id: number | null) => (id == null ? null : (people.get(id)?.shortname ?? people.get(id)?.name ?? 'Okänd'))
    const out: EventRow[] = []
    for (const e of events.data ?? []) {
      const matchtype = e.matchtype ?? 'Övrigt'
      const level = e.level ?? '–'
      if (f.typesOff.includes(matchtype) || f.levelsOff.includes(level)) continue
      const roles: [Kind, number | null, number | null][] = [
        ['Mål', e.goal, e.assist],
        ['Assist', e.assist, e.goal],
        ['Räddning', e.save, null],
      ]
      for (const [kind, pid, partnerId] of roles) {
        if (pid == null || kindsOff.includes(kind)) continue
        const p = people.get(pid)
        const row: EventRow = {
          key: `${e.id}-${kind}`, matchId: e.match_id, playerId: pid,
          shortname: p?.shortname ?? p?.name ?? 'Okänd', name: p?.name ?? '', status: p?.status ?? null,
          kind, partner: nameOf(partnerId), type: kind === 'Räddning' ? null : e.type, minute: e.minute,
          date: e.date, opponent: e.opponent, cup: e.cup_name, matchtype, level,
        }
        if (filters.search && !`${row.shortname} ${row.name}`.toLowerCase().includes(filters.search)) continue
        if (p && !filters.playerStatuses.includes(p.status ?? '')) continue
        out.push(row)
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.data, matches.data, filters.search, filters.playerStatuses, f.typesOff, f.levelsOff, kindsOff])

  type P = (typeof players)[number]
  const sum = (fn: (r: P) => number) => players.reduce((a, r) => a + fn(r), 0)
  const ratio = (n: number, m: number) => (m ? Math.round((n / m) * 100) / 100 : null)
  const playerColumns: Column<P>[] = [
    { key: 'name', label: 'Namn', value: (r) => r.shortname, render: (r) => <NameCell shortname={r.shortname} name={r.name} /> },
    { key: 'rank', label: 'Nivå', value: (r) => rankIndex(r.rank), render: (r) => <RankBadge rank={r.rank} /> },
    { key: 'matches', label: 'Matcher', align: 'right', value: (r) => r.matches, total: sum((r) => r.matches) },
    { key: 'goals', label: 'Mål', align: 'right', value: (r) => r.goals, render: (r) => <b>{r.goals}</b>, total: sum((r) => r.goals) },
    { key: 'assists', label: 'Assist', align: 'right', value: (r) => r.assists, render: (r) => <b>{r.assists}</b>, total: sum((r) => r.assists) },
    { key: 'points', label: 'Poäng', align: 'right', title: 'Mål + assist', value: (r) => r.goals + r.assists, total: sum((r) => r.goals + r.assists) },
    { key: 'saves', label: 'Rädd.', align: 'right', title: 'Räddningar', value: (r) => r.saves, total: sum((r) => r.saves) },
    {
      key: 'gpm', label: 'Mål/match', align: 'right', value: (r) => ratio(r.goals, r.matches),
      render: (r) => (ratio(r.goals, r.matches) ?? 0).toLocaleString('sv-SE', { minimumFractionDigits: 2 }),
    },
    {
      key: 'ppm', label: 'Poäng/match', align: 'right', value: (r) => ratio(r.goals + r.assists, r.matches),
      render: (r) => (ratio(r.goals + r.assists, r.matches) ?? 0).toLocaleString('sv-SE', { minimumFractionDigits: 2 }),
    },
  ]

  const eventColumns: Column<EventRow>[] = [
    { key: 'name', label: 'Spelare', value: (r) => r.shortname, render: (r) => <span className="font-medium">{r.shortname}</span> },
    {
      key: 'kind', label: 'Händelse', value: (r) => KINDS.indexOf(r.kind), firstDir: 'asc',
      render: (r) => <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${KIND_CLASS[r.kind]}`}>{r.kind}</span>,
    },
    {
      key: 'partner', label: 'Med', title: 'Assist vid mål, målskytt vid assist', value: (r) => r.partner,
      render: (r) => <span className="text-muted-foreground">{r.partner ?? '–'}</span>,
    },
    { key: 'type', label: 'Typ', value: (r) => r.type, render: (r) => <span className="text-muted-foreground">{r.type ?? '–'}</span> },
    { key: 'minute', label: 'Min', align: 'right', firstDir: 'asc', value: (r) => r.minute, render: (r) => (r.minute != null ? `${r.minute}'` : '–') },
    {
      key: 'match', label: 'Match', value: (r) => r.opponent,
      render: (r) => (
        <div className="flex flex-col">
          <span>{r.opponent ?? 'Motståndare'}</span>
          <span className="text-[11px] text-muted-foreground">{r.cup ?? r.matchtype}</span>
        </div>
      ),
    },
    { key: 'date', label: 'Datum', value: (r) => r.date, firstDir: 'desc', render: (r) => <span className="tabular-nums text-muted-foreground">{day(r.date)}</span> },
    { key: 'level', label: 'Nivå', value: (r) => LEVEL_ORDER.indexOf(r.level), firstDir: 'asc', render: (r) => <RankBadge rank={r.level === '–' ? null : r.level} /> },
  ]

  const loading = matches.loading || events.loading
  const counts = { Mål: 0, Assist: 0, Räddning: 0 } as Record<Kind, number>
  for (const r of eventRows) counts[r.kind]++

  return (
    <>
      {slot && createPortal(
        <>
          <FilterRow label="Visa">
            <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'players', label: 'Per spelare' }, { value: 'events', label: 'Alla händelser' }]} />
            {mode === 'events' && KINDS.map((k) => (
              <Chip key={k} on={!kindsOff.includes(k)} onClick={() => setKindsOff(toggle(kindsOff, k))}>{k}</Chip>
            ))}
          </FilterRow>
          <MatchFilterRows data={matches.data} f={f} />
        </>,
        slot,
      )}
      <section className={`overflow-hidden rounded-xl border border-border bg-card ${loading ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">
            {mode === 'players' ? `Mål, assist och räddningar · ${players.length} spelare` : `Alla händelser · ${eventRows.length} st`}
          </h2>
          {mode === 'events' && (
            <span className="text-xs text-muted-foreground">{counts.Mål} mål · {counts.Assist} assist · {counts.Räddning} räddningar</span>
          )}
        </div>
        {!matches.data || (mode === 'events' && !events.data) ? (
          <div className="h-64 animate-pulse bg-muted/50" />
        ) : mode === 'players' ? (
          <DataTable
            key="players"
            rows={players}
            columns={playerColumns}
            initialSort={{ key: 'points', dir: 'desc' }}
            rowKey={(r) => r.id}
            onRowClick={(r) => setPerson({ kind: 'player', id: r.id, name: r.name || (r.shortname ?? '') })}
            empty="Inga spelade matcher under perioden."
          />
        ) : (
          <DataTable
            key="events"
            rows={eventRows}
            columns={eventColumns}
            initialSort={{ key: 'date', dir: 'desc' }}
            rowKey={(r) => r.key}
            onRowClick={(r) => router.push(`/matches/${r.matchId}`)}
            empty="Inga mål, assist eller räddningar under perioden."
          />
        )}
      </section>
      <PersonStatsDialog person={person} onClose={() => setPerson(null)} />
    </>
  )
}
