'use client'

import { useSvenskalagExtension } from '../svar/SyncRepliesButton'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, CloudDownload, Image as ImageIcon, Loader2, SlidersHorizontal, Users } from 'lucide-react'
import { useGetPlanningEvents } from '../../hooks/backend/planning'
import { useGetSquadGenders } from '../../hooks/backend/players'
import { GENDERS, GENDER_PLURAL } from '../../utils/gender'
import { usePersistentState } from '../../hooks/usePersistentState'
import { AttendanceStatsButton } from '../../components/AttendanceStatsButton'
import SquadLogo from '../../components/SquadLogo'
import { canEdit, currentSquad } from '../../lib/squad-store'
import { cn } from '../../lib/shadcn/utils'
import SlotColumn from './SlotColumn'
import AnswersDialog from './AnswersDialog'
import SummaryDialog from './SummaryDialog'
import OverviewDialog from './OverviewDialog'
import TotalDialog from './TotalDialog'
import { PERIODS, PLAYER_STATUSES, periodFrom, type Kind } from './shared'
import { useSquadStatuses } from '../../hooks/useSquadStatuses'

type Slots = (number | null)[]
const EMPTY: Slots = [null, null, null, null]
const MATCH_TYPES = ['Serie', 'Träning', 'Cup']

/**
 * Planering av kallelser: upp till fyra matcher eller cuper bredvid varandra
 * (på mobilen en i taget), med kallade och ej kallade spelare.
 */
export default function Planning() {
  const squad = currentSquad()
  const sid = squad?.squadId ?? 0
  const [kind, setKind] = usePersistentState<Kind>('hl-plan-kind', 'match')
  const [matchTypes, setMatchTypes] = usePersistentState<string[]>('hl-plan-types', ['Serie', 'Träning'])
  const [showAll, setShowAll] = usePersistentState('hl-plan-all', false)
  const [months, setMonths] = usePersistentState('hl-plan-months', 2)
  const [playerStatuses, setPlayerStatuses] = usePersistentState<string[]>('hl-plan-pstatus', ['Aktiv', 'Aktiv, ej matchklar'])
  const [matchSlots, setMatchSlots] = usePersistentState<Slots>(`hl-plan-slots-match-${sid}`, EMPTY)
  const [cupSlots, setCupSlots] = usePersistentState<Slots>(`hl-plan-slots-cup-${sid}`, EMPTY)
  const [genders, setGenders] = usePersistentState<string[]>('hl-plan-genders', [...GENDERS])
  const [mobileSlot, setMobileSlot] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [answers, setAnswers] = useState<{ id: number; title: string } | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [totalOpen, setTotalOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Synka svar från Svenskalag (kräver webbläsartillägget): en i taget, i kö
  const canSync = useSvenskalagExtension()
  const [syncAllKey, setSyncAllKey] = useState(0)
  const [syncPending, setSyncPending] = useState(0)
  const syncQueue = useRef<Promise<void>>(Promise.resolve())
  function enqueue(job: () => Promise<void>) {
    setSyncPending((n) => n + 1)
    const next = syncQueue.current.then(job).catch(() => {}).finally(() => setSyncPending((n) => n - 1))
    syncQueue.current = next
    return next
  }
  const events = useGetPlanningEvents()
  const squadGenders = useGetSquadGenders()
  const statusVisible = useSquadStatuses()
  useEffect(() => {
    squadGenders.trigger().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Valen om kön visas bara när laget har både pojkar och flickor
  const mixed = !!squadGenders.data?.mixed
  const genderFilter = mixed ? genders : [...GENDERS]

  const slots = kind === 'match' ? matchSlots : cupSlots
  const setRawSlots = kind === 'match' ? setMatchSlots : setCupSlots
  // Valda matcher/cuper ligger alltid först, utan luckor (t.ex. när 1 tas bort flyttar 2 upp)
  const compact = (list: Slots) => {
    const ids = list.filter((x): x is number => !!x)
    return EMPTY.map((_, i) => ids[i] ?? null)
  }
  const setSlots = (list: Slots) => setRawSlots(compact(list))
  useEffect(() => {
    const c = compact(slots)
    if (c.some((v, i) => v !== slots[i])) setRawSlots(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, slots.join(',')])
  // Nästa val syns först när det föregående är gjort
  const visibleCount = Math.min(EMPTY.length, slots.filter(Boolean).length + 1)
  const visible = slots.slice(0, visibleCount)
  useEffect(() => {
    if (mobileSlot >= visibleCount) setMobileSlot(visibleCount - 1)
  }, [mobileSlot, visibleCount])
  const from = useMemo(() => periodFrom(months), [months])
  const typesKey = matchTypes.join(',')

  useEffect(() => {
    events.trigger({ kind, matchTypes, includeFinished: showAll }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, typesKey, showAll, refreshKey])

  const all = events.data ?? []
  const titleOf = (id: number) => all.find((e) => e.id === id)?.title ?? `${kind === 'match' ? 'Match' : 'Cup'} ${id}`
  const filled = slots
    .map((id, index) => (id ? { index, id, title: titleOf(id) } : null))
    .filter((s): s is { index: number; id: number; title: string } => !!s)

  if (!canEdit()) {
    return <p className="p-6 text-sm text-muted-foreground">Planeringen är bara för lagets ledare.</p>
  }

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  const chip = (on: boolean) =>
    cn(
      'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
    )

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-3 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SquadLogo />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Planering</h1>
              <p className="text-sm text-team-accent/70">Kallelser till matcher och cuper</p>
            </div>
          </div>
          <AttendanceStatsButton />
        </div>
      </div>

      {/* Filter */}
      <div className="z-10 flex flex-col gap-2 border-b border-border bg-background px-4 py-3 md:sticky md:top-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(['match', 'cup'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={cn('rounded-md px-3 py-1 text-sm font-medium', kind === k ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                {k === 'match' ? 'Matcher' : 'Cuper'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" onClick={() => setShowAll(v)}
                className={cn('rounded-md px-3 py-1 text-sm font-medium', showAll === v ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                {v ? 'Alla' : 'Kommande'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1.5">
            <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}
              className={cn('flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm md:hidden', filtersOpen && 'bg-muted')}>
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </button>
            {canSync && (
              <button type="button" onClick={() => setSyncAllKey((k) => k + 1)} disabled={filled.length === 0 || syncPending > 0}
                title="Hämta kallelsesvaren från Svenskalag för alla valda"
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
                {syncPending > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />} Synka svar
              </button>
            )}
            <button type="button" onClick={() => setTotalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted">
              <Users className="h-4 w-4" /> Totalt
            </button>
            <button type="button" onClick={() => setSummaryOpen(true)} disabled={filled.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
              <ClipboardList className="h-4 w-4" /> {kind === 'match' ? 'Fogis' : 'Summering'}
            </button>
            <button type="button" onClick={() => setOverviewOpen(true)} disabled={filled.length === 0}
              title="Bild med alla valda sida vid sida, att skicka till andra"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
              <ImageIcon className="h-4 w-4" /> Översikt
            </button>
          </div>
        </div>
        <div className={cn('flex-wrap items-center gap-x-4 gap-y-2 md:flex', filtersOpen ? 'flex' : 'hidden')}>
          {kind === 'match' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Typ</span>
              {MATCH_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setMatchTypes(toggle(matchTypes, t))} className={chip(matchTypes.includes(t))}>
                  {t}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Närvaro</span>
            {PERIODS.map((p) => (
              <button key={p.months} type="button" onClick={() => setMonths(p.months)} className={chip(months === p.months)}>
                {p.label}
              </button>
            ))}
          </div>
          {mixed && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Kön</span>
              {GENDERS.map((g) => (
                <button key={g} type="button" onClick={() => setGenders(toggle(genders, g))} className={chip(genders.includes(g))}>
                  {GENDER_PLURAL[g]}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Ej kallade</span>
            {PLAYER_STATUSES.filter(statusVisible).map((s) => (
              <button key={s} type="button" onClick={() => setPlayerStatuses(toggle(playerStatuses, s))} className={chip(playerStatuses.includes(s))}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobil: en kolumn i taget */}
      <div className="flex gap-1 px-4 pt-3 md:hidden">
        {visible.map((id, i) => (
          <button key={i} type="button" onClick={() => setMobileSlot(i)}
            className={cn('min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-xs font-medium',
              mobileSlot === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {i + 1}{id ? `. ${titleOf(id)}` : ''}
          </button>
        ))}
      </div>

      {/* De valda kolumnerna delar på bredden */}
      <div className="grid gap-3 p-3 md:p-4 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {visible.map((id, i) => {
          const taken = new Set(slots.filter((s, j) => s && j !== i) as number[])
          const neighbor = (j: number) => {
            const nid = slots[j]
            return j >= 0 && j < slots.length && nid ? { index: j, id: nid, title: titleOf(nid) } : null
          }
          return (
            <SlotColumn
              key={`${kind}-${i}`}
              className={cn(i !== mobileSlot && 'hidden md:flex')}
              kind={kind}
              index={i}
              eventId={id}
              options={all.filter((e) => !taken.has(e.id))}
              onSelect={(v) => setSlots(slots.map((s, j) => (j === i ? v : s)))}
              from={from}
              playerStatuses={playerStatuses}
              genders={genderFilter}
              mixed={mixed}
              refreshKey={refreshKey}
              onChanged={() => setRefreshKey((k) => k + 1)}
              prev={neighbor(i - 1)}
              next={neighbor(i + 1)}
              onOpenAnswers={(eid, title) => setAnswers({ id: eid, title })}
              onOpenSummary={() => setSummaryOpen(true)}
              canSync={canSync}
              syncAllKey={syncAllKey}
              enqueue={enqueue}
              otherEventIds={filled.filter((f) => f.index !== i).map((f) => f.id)}
              periodLabel={PERIODS.find((p) => p.months === months)?.label ?? ''}
            />
          )
        })}
      </div>

      <AnswersDialog kind={kind} target={answers} onClose={() => setAnswers(null)} onChanged={() => setRefreshKey((k) => k + 1)} />
      <SummaryDialog kind={kind} eventIds={filled.map((s) => s.id)} open={summaryOpen} onClose={() => setSummaryOpen(false)} />
      <OverviewDialog kind={kind} eventIds={filled.map((s) => s.id)} open={overviewOpen} from={from} months={months}
        onClose={() => setOverviewOpen(false)} />
      <TotalDialog kind={kind} slots={filled} open={totalOpen} from={from} playerStatuses={playerStatuses} genders={genderFilter} mixed={mixed}
        onClose={() => setTotalOpen(false)} onChanged={() => setRefreshKey((k) => k + 1)} />
    </div>
  )
}
