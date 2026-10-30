'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ArrowUp, ArrowDown, ChevronsUpDown, RotateCcw } from 'lucide-react'
import { useGetTrainingAttendance } from '../hooks/backend/trainings'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../lib/shadcn/dialog'
import { rankStyle } from '../utils/rankColors'
import { PlayerTrainingsDialog } from './PlayerTrainingsDialog'

interface AttendanceRow {
  id: number
  shortname: string | null
  rank: string | null
  coming: number
  total: number
  percent: number | null
}

const ATTENDANCE_STATUSES = ['Aktiv', 'Aktiv, ej matchklar', 'Provspelare', 'Gästspelare', 'Vilande', 'Slutat'] as const
const ATTENDANCE_PERIODS = [
  { label: '1 mån', months: 1 },
  { label: '2 mån', months: 2 },
  { label: '3 mån', months: 3 },
  { label: '6 mån', months: 6 },
  { label: '1 år', months: 12 },
  { label: 'Alla', months: 0 },
] as const
const ATTENDANCE_RANK_ORDER: Record<string, number> = { A: 0, AB: 1, B: 2, BC: 3, C: 4, CD: 5, D: 6, X: 7 }
type StatsSortKey = 'name' | 'rank' | 'coming' | 'percent'

/** Circular header button that opens the training attendance stats popup. */
export function AttendanceStatsButton() {
  const { data: statsData, loading: statsLoading, trigger: fetchStats } = useGetTrainingAttendance()
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsDate1, setStatsDate1] = useState('')
  const [statsDate2, setStatsDate2] = useState('')
  const [statsStatuses, setStatsStatuses] = useState<Set<string>>(new Set(['Aktiv', 'Aktiv, ej matchklar']))
  const [statsPeriod, setStatsPeriod] = useState(2)
  const [statsSort, setStatsSort] = useState<{ key: StatsSortKey; dir: 'asc' | 'desc' } | null>(null)
  const [detailPlayer, setDetailPlayer] = useState<{ id: number; name: string } | null>(null)
  const statusKey = Array.from(statsStatuses).sort().join(',')

  const statsRows = (statsData as unknown as AttendanceRow[] | undefined) ?? []

  const sortedStatsRows = useMemo(() => {
    if (!statsSort) return statsRows
    const dir = statsSort.dir === 'asc' ? 1 : -1
    const rankIdx = (r: string | null) => (r ? ATTENDANCE_RANK_ORDER[r.toUpperCase()] ?? 99 : 99)
    const arr = [...statsRows]
    arr.sort((a, b) => {
      const nameCmp = (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv')
      let cmp = 0
      switch (statsSort.key) {
        case 'name': return nameCmp * dir
        case 'rank': cmp = rankIdx(a.rank) - rankIdx(b.rank); break
        case 'coming': cmp = a.coming - b.coming; break
        case 'percent': cmp = (a.percent ?? -1) - (b.percent ?? -1); break
      }
      if (cmp !== 0) return cmp * dir
      return nameCmp
    })
    return arr
  }, [statsRows, statsSort])

  function toggleStatsSort(key: StatsSortKey) {
    setStatsSort(prev => {
      if (prev && prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: key === 'name' ? 'asc' : 'desc' }
    })
  }

  function applyStatsPeriod(months: number) {
    const now = new Date()
    setStatsDate2(now.toISOString().slice(0, 10))
    if (months === 0) {
      setStatsDate1('2000-01-01')
    } else {
      const from = new Date(now)
      from.setMonth(from.getMonth() - months)
      setStatsDate1(from.toISOString().slice(0, 10))
    }
    setStatsPeriod(months)
  }

  function openStats() {
    if (!statsDate1 || !statsDate2) applyStatsPeriod(statsPeriod)
    setStatsOpen(true)
  }

  useEffect(() => {
    if (!statsOpen || !statsDate1 || !statsDate2) return
    fetchStats({ date1: statsDate1, date2: statsDate2, statuses: Array.from(statsStatuses) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsOpen, statsDate1, statsDate2, statusKey])

  function sortIcon(key: StatsSortKey) {
    if (statsSort?.key !== key) return <ChevronsUpDown className="w-3 h-3 opacity-50" />
    return statsSort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
  }

  return (
    <>
      <button
        onClick={openStats}
        className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
        aria-label="Närvarostatistik"
        title="Närvarostatistik"
      >
        <BarChart3 className="w-5 h-5" />
      </button>

      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[460px] px-3">
          <DialogHeader>
            <DialogTitle>Närvarostatistik</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {ATTENDANCE_PERIODS.map(opt => {
                const active = statsPeriod === opt.months
                return (
                  <button
                    key={opt.months}
                    onClick={() => applyStatsPeriod(opt.months)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ATTENDANCE_STATUSES.map(s => {
                const on = statsStatuses.has(s)
                return (
                  <button
                    key={s}
                    onClick={() => setStatsStatuses(prev => {
                      const next = new Set(prev)
                      if (next.has(s)) next.delete(s)
                      else next.add(s)
                      return next
                    })}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{statsRows.length} spelare</span>
              {statsSort && (
                <button
                  onClick={() => setStatsSort(null)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Återställ sortering
                </button>
              )}
            </div>
            <div className="max-h-[55vh] overflow-y-auto -mx-2 px-2">
              {statsLoading && statsRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Laddar…</p>
              ) : statsRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Ingen data för valt intervall.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pl-1 pr-1 font-semibold">
                        <button onClick={() => toggleStatsSort('name')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Namn {sortIcon('name')}
                        </button>
                      </th>
                      <th className="py-2 px-1 font-semibold text-center">
                        <button onClick={() => toggleStatsSort('rank')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Rank {sortIcon('rank')}
                        </button>
                      </th>
                      <th className="py-2 px-1 font-semibold text-center">
                        <button onClick={() => toggleStatsSort('coming')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Kom/Tot {sortIcon('coming')}
                        </button>
                      </th>
                      <th className="py-2 pr-1 pl-1 font-semibold text-right">
                        <button onClick={() => toggleStatsSort('percent')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          % {sortIcon('percent')}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStatsRows.map(r => {
                      const pct = r.percent != null ? Math.round(r.percent * 100) : null
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setDetailPlayer({ id: r.id, name: r.shortname ?? '' })}
                          className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-1.5 pl-1 pr-1 text-foreground truncate">{r.shortname ?? '–'}</td>
                          <td className="py-1.5 px-1 text-center">
                            {r.rank ? (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={rankStyle(r.rank)}>{r.rank}</span>
                            ) : '–'}
                          </td>
                          <td className="py-1.5 px-1 text-center tabular-nums text-muted-foreground whitespace-nowrap">{r.coming}/{r.total}</td>
                          <td className="py-1.5 pr-1 pl-1 text-right tabular-nums font-semibold text-foreground">{pct != null ? `${pct}%` : '–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PlayerTrainingsDialog
        open={detailPlayer != null}
        onOpenChange={(o) => { if (!o) setDetailPlayer(null) }}
        playerId={detailPlayer?.id ?? null}
        playerName={detailPlayer?.name ?? ''}
        date1={statsDate1}
        date2={statsDate2}
      />
    </>
  )
}
