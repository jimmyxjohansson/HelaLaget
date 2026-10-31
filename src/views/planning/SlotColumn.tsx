'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, ClipboardList, ExternalLink, Loader2, MessageSquare, Plus, Trash2, UserPlus, X,
} from 'lucide-react'
import {
  useAddPlanningLeaders,
  useAddPlanningPlayers,
  useGetPlanningCandidates,
  useGetPlanningSlot,
  useMovePlanningParticipants,
  useRemovePlanningParticipants,
  useSetPlanningEventStatus,
  useSetPlanningStatus,
} from '../../hooks/backend/planning'
import { Combobox } from '../../components/Combobox'
import { VisualCheckbox } from '../../components/VisualCheckbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../lib/shadcn/select'
import { cn } from '../../lib/shadcn/utils'
import { rankStyle } from '../../utils/rankColors'
import type { PlanningEvent } from '../../server/functions/planning/getPlanningEvents'
import {
  ANSWERS, answerHex, answerIndex, Counts, EVENT_STATUSES, formatCupDates, formatWhen, percent, percentClass,
  rankIndex, SortHead, sortRows, type Kind, type SortState,
} from './shared'

type PlayerSort = 'name' | 'rank' | 'status' | 'percent'
type CandidateSort = 'name' | 'rank' | 'lastmatch' | 'matches' | 'percent'

type Neighbor = { index: number; id: number; title: string } | null

type Props = {
  kind: Kind
  index: number
  eventId: number | null
  /** Matcher/cuper att välja bland (de som valts i andra kolumner är borttagna) */
  options: PlanningEvent[]
  onSelect: (id: number | null) => void
  from: string | null
  playerStatuses: string[]
  refreshKey: number
  /** Något ändrades: ladda om alla kolumner och listor */
  onChanged: () => void
  prev: Neighbor
  next: Neighbor
  onOpenAnswers: (id: number, title: string) => void
  onOpenSummary: () => void
  className?: string
}

/** En kolumn i planeringen: välj match/cup, sätt svar, lägg till och flytta spelare. */
export default function SlotColumn(props: Props) {
  const { kind, index, eventId, from, playerStatuses, refreshKey, onChanged } = props
  const slot = useGetPlanningSlot()
  const candidates = useGetPlanningCandidates()
  const addPlayers = useAddPlanningPlayers()
  const addLeaders = useAddPlanningLeaders()
  const setStatus = useSetPlanningStatus()
  const remove = useRemovePlanningParticipants()
  const move = useMovePlanningParticipants()
  const setEventStatus = useSetPlanningEventStatus()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [playerSort, setPlayerSort] = useState<SortState<PlayerSort>>(null)
  const statusKey = playerStatuses.join(',')

  useEffect(() => {
    setSelected(new Set())
    setSelectedCandidates(new Set())
    setError(null)
    setInfo(null)
  }, [eventId, kind])

  useEffect(() => {
    if (!eventId) return
    slot.trigger({ kind, id: eventId, from }).catch((e: Error) => setError(e.message))
    candidates.trigger({ kind, eventIds: [eventId], from, playerStatuses }).catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, eventId, from, statusKey, refreshKey])

  const data = eventId && slot.data?.event.id === eventId ? slot.data : null
  const ev = data?.event
  const players = sortRows(data?.players ?? [], playerSort, (p, k) =>
    k === 'name' ? p.shortname
      : k === 'rank' ? rankIndex(p.rank)
        : k === 'status' ? answerIndex(p.status)
          : percent(p.coming, p.total))
  const cands = eventId ? (candidates.data ?? []) : []

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await action()
      if (done) setInfo(done)
      setSelected(new Set())
      setSelectedCandidates(new Set())
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    } finally {
      setBusy(false)
    }
  }

  const options = useMemo(
    () => {
      // Vald match som inte finns i listan längre (t.ex. satt till Avslutad) visas ändå
      const list: PlanningEvent[] =
        ev && !props.options.some((o) => o.id === ev.id)
          ? [{ ...ev, matchtype: ev.matchtype, enddate: ev.enddate } as PlanningEvent, ...props.options]
          : props.options
      return list.map((o) => ({
        value: String(o.id),
        label: o.title,
        imageUrl: o.imgurl,
        description: [
          o.difficulty,
          kind === 'match' ? formatWhen(o.date) : formatCupDates(o.date, o.enddate),
          `${o.proposed}/${o.invited}/${o.coming}/${o.declined}`,
        ]
          .filter(Boolean)
          .join(' · '),
      }))
    },
    [props.options, kind, ev],
  )

  function toggle(set: Set<number>, id: number) {
    const n = new Set(set)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  }

  const allSelected = players.length > 0 && players.every((p) => selected.has(p.id))
  const selIds = Array.from(selected)
  const candIds = Array.from(selectedCandidates)

  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border border-border bg-background p-3 min-w-0', props.className)}>
      {/* Välj match/cup */}
      <div className="flex items-center gap-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <Combobox
            options={options}
            value={eventId ? String(eventId) : ''}
            onValueChange={(v) => props.onSelect(v ? Number(v) : null)}
            placeholder={kind === 'match' ? 'Välj match' : 'Välj cup'}
            searchPlaceholder="Sök…"
            emptyMessage={kind === 'match' ? 'Inga matcher' : 'Inga cuper'}
          />
        </div>
        {eventId && (
          <button
            type="button"
            onClick={() => props.onSelect(null)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Töm kolumnen"
            title="Töm kolumnen"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!eventId ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {kind === 'match' ? 'Välj en match att planera.' : 'Välj en cup att planera.'}
        </p>
      ) : !ev ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Kort */}
          <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-2.5">
            <div className="flex items-center gap-2.5">
              {kind === 'match' && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background">
                  {ev.imgurl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.imgurl} alt="" className="h-8 w-8 object-contain" />
                  ) : (
                    <span className="font-bold text-muted-foreground">{ev.title[0]}</span>
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={kind === 'match' ? `/matches/${ev.id}` : `/cups/${ev.id}`}
                  className="block truncate font-semibold hover:underline"
                >
                  {ev.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    ev.difficulty,
                    kind === 'match' ? formatWhen(ev.date) : formatCupDates(ev.date, ev.enddate),
                    ev.homeaway,
                    ev.matchplayers,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={ev.status ?? ''}
                onValueChange={(v) => run(() => setEventStatus.trigger({ kind, id: ev.id, status: v }))}
              >
                <SelectTrigger className="h-8 flex-1 bg-background text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES[kind].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ev.svenskalag && (
                <a href={ev.svenskalag} target="_blank" rel="noreferrer" title="Öppna i Svenskalag"
                  className="flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-muted">
                  SL <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {ev.fogislink && (
                <a href={ev.fogislink} target="_blank" rel="noreferrer" title="Öppna i Fogis"
                  className="flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-muted">
                  Fogis <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <Counts c={ev} />
              <div className="flex gap-1">
                <button type="button" onClick={() => props.onOpenAnswers(ev.id, ev.title)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-background" title="Svar och anledningar">
                  <MessageSquare className="h-3.5 w-3.5" /> Svar
                </button>
                <button type="button" onClick={props.onOpenSummary}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-background"
                  title={kind === 'match' ? 'Fogis-summering' : 'Cupsummering'}>
                  <ClipboardList className="h-3.5 w-3.5" /> {kind === 'match' ? 'Fogis' : 'Summering'}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {info && <p className="text-xs text-muted-foreground">{info}</p>}

          {/* Kallade */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(allSelected ? new Set() : new Set(players.map((p) => p.id)))}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                disabled={players.length === 0}
              >
                <VisualCheckbox checked={allSelected} />
                Kallade ({players.length})
              </button>
              {(busy || slot.loading) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            {selIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-1.5">
                {ANSWERS.map((a) => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.value}
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => setStatus.trigger({ kind, id: ev.id, participantIds: selIds, status: a.value }))}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: a.hex }}
                      title={`Sätt ${a.value}`}
                    >
                      <Icon className="h-3 w-3" /> {a.value}
                    </button>
                  )
                })}
                <span className="mx-0.5 h-5 w-px bg-border" />
                {props.prev && (
                  <button type="button" disabled={busy}
                    onClick={() => run(async () => {
                      const r = await move.trigger({ kind, fromId: ev.id, toId: props.prev!.id, participantIds: selIds })
                      if (r.skipped) setInfo(`${r.skipped} fanns redan i ${props.prev!.title}.`)
                    })}
                    className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] hover:bg-muted"
                    title={`Flytta till ${props.prev.index + 1}: ${props.prev.title}`}>
                    <ArrowLeft className="h-3 w-3" /> {props.prev.index + 1}
                  </button>
                )}
                {props.next && (
                  <button type="button" disabled={busy}
                    onClick={() => run(async () => {
                      const r = await move.trigger({ kind, fromId: ev.id, toId: props.next!.id, participantIds: selIds })
                      if (r.skipped) setInfo(`${r.skipped} fanns redan i ${props.next!.title}.`)
                    })}
                    className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] hover:bg-muted"
                    title={`Flytta till ${props.next.index + 1}: ${props.next.title}`}>
                    {props.next.index + 1} <ArrowRight className="h-3 w-3" />
                  </button>
                )}
                <button type="button" disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Ta bort ${selIds.length} ${selIds.length === 1 ? 'spelare' : 'spelare'} från ${ev.title}?`)) {
                      run(() => remove.trigger({ kind, id: ev.id, participantIds: selIds }))
                    }
                  }}
                  className="ml-auto rounded-full p-1.5 text-destructive hover:bg-destructive/10" title="Ta bort">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {players.length > 0 && (
              <div className="flex items-center gap-2 px-1.5">
                <span className="w-4 shrink-0" />
                <SortHead label="Namn" k="name" sort={playerSort} onSort={setPlayerSort} className="min-w-0 flex-1" />
                <SortHead label="Rank" k="rank" sort={playerSort} onSort={setPlayerSort} className="w-9 shrink-0" />
                <SortHead label="Svar" k="status" sort={playerSort} onSort={setPlayerSort} className="w-12 shrink-0" />
                <SortHead label="%" k="percent" sort={playerSort} onSort={setPlayerSort} firstDir="desc"
                  className="w-9 shrink-0 justify-end" title="Sortera på träningsnärvaro" />
              </div>
            )}
            <ul className="flex flex-col">
              {players.map((p) => {
                const pct = percent(p.coming, p.total)
                const grey = p.status === 'Nekat' || p.status === 'Ej svarat'
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected((s) => toggle(s, p.id))}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted',
                        selected.has(p.id) && 'bg-primary/10',
                        grey && 'text-muted-foreground',
                      )}
                    >
                      <VisualCheckbox checked={selected.has(p.id)} />
                      <span className="flex min-w-0 flex-1 items-center gap-1">
                        <span className="truncate">
                          {p.shortname}
                          {p.playerstatus && p.playerstatus !== 'Aktiv' && (
                            <span className="ml-1 text-[10px] text-muted-foreground">({p.playerstatus})</span>
                          )}
                        </span>
                        {p.reason && (
                          <span title={p.reason} className="shrink-0">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" aria-label={p.reason} />
                          </span>
                        )}
                      </span>
                      <span className="w-9 shrink-0">
                        {p.rank && <span className="rounded px-1 text-[10px] font-bold" style={rankStyle(p.rank)}>{p.rank}</span>}
                      </span>
                      <span className="flex w-12 shrink-0 items-center" title={p.status ?? ''}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: answerHex(p.status) }} />
                      </span>
                      <span className={cn('w-9 shrink-0 text-right text-xs tabular-nums', percentClass(pct))} title={`${p.coming} av ${p.total} träningar`}>
                        {pct != null ? `${pct}%` : '–'}
                      </span>
                    </button>
                  </li>
                )
              })}
              {players.length === 0 && <li className="px-1.5 py-2 text-xs text-muted-foreground">Ingen kallad ännu.</li>}
            </ul>
          </div>

          {/* Ledare */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ledare</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {(data?.leaders ?? []).map((l) => (
                <span key={l.id} className="flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-xs">
                  {l.shortname}
                  <button type="button" disabled={busy}
                    onClick={() => run(() => remove.trigger({ kind, id: ev.id, participantIds: [l.id] }))}
                    className="rounded-full p-0.5 hover:bg-background" aria-label={`Ta bort ${l.shortname}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {(data?.availableLeaders.length ?? 0) > 0 && (
                <Select value="" onValueChange={(v) => run(() => addLeaders.trigger({ kind, id: ev.id, leaderIds: [Number(v)] }))}>
                  <SelectTrigger className="h-7 w-auto gap-1 rounded-full border-dashed px-2.5 text-xs">
                    <UserPlus className="h-3 w-3" />
                    <SelectValue placeholder="Ledare" />
                  </SelectTrigger>
                  <SelectContent>
                    {data!.availableLeaders.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>{l.shortname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Ej kallade */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ej kallade ({cands.length})</p>
              {candIds.length > 0 && (
                <button type="button" disabled={busy}
                  onClick={() => run(() => addPlayers.trigger({ kind, id: ev.id, playerIds: candIds }))}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: answerHex('Förslag') }}>
                  <Plus className="h-3 w-3" /> Lägg till {candIds.length} som förslag
                </button>
              )}
            </div>
            <CandidateList
              rows={cands}
              selected={selectedCandidates}
              onToggle={(id) => setSelectedCandidates((s) => toggle(s, id))}
            />
          </div>
        </>
      )}
    </section>
  )
}

type CandidateRow = {
  id: number
  shortname: string | null
  number: number | null
  rank: string | null
  backbone: string | null
  status: string | null
  coming: number
  total: number
  lastmatch: number | null
  matches: number
}

/** Spelare som inte är kallade: rank, närvaro, dagar sedan senaste match och antal matcher. */
export function CandidateList({
  rows,
  selected,
  onToggle,
}: {
  rows: CandidateRow[]
  selected: Set<number>
  onToggle: (id: number) => void
}) {
  const [sort, setSort] = useState<SortState<CandidateSort>>(null)
  if (rows.length === 0) return <p className="px-1.5 py-2 text-xs text-muted-foreground">Inga fler spelare med valda filter.</p>
  const sorted = sortRows(rows, sort, (p, k) =>
    k === 'name' ? p.shortname
      : k === 'rank' ? rankIndex(p.rank)
        : k === 'lastmatch' ? p.lastmatch
          : k === 'matches' ? p.matches
            : percent(p.coming, p.total))
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-1.5 pb-0.5">
        <span className="w-4 shrink-0" />
        <SortHead label="Namn" k="name" sort={sort} onSort={setSort} className="min-w-0 flex-1" />
        <SortHead label="Rank" k="rank" sort={sort} onSort={setSort} className="w-9 shrink-0" />
        <SortHead label="Sen." k="lastmatch" sort={sort} onSort={setSort} firstDir="desc"
          className="w-9 shrink-0 justify-end" title="Sortera på dagar sedan senaste match" />
        <SortHead label="M" k="matches" sort={sort} onSort={setSort}
          className="w-7 shrink-0 justify-end" title="Sortera på antal matcher under perioden" />
        <SortHead label="%" k="percent" sort={sort} onSort={setSort} firstDir="desc"
          className="w-9 shrink-0 justify-end" title="Sortera på träningsnärvaro" />
      </div>
    <ul className="flex flex-col">
      {sorted.map((p) => {
        const pct = percent(p.coming, p.total)
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onToggle(p.id)}
              className={cn('flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted', selected.has(p.id) && 'bg-primary/10')}
            >
              <VisualCheckbox checked={selected.has(p.id)} />
              <span className="min-w-0 flex-1 truncate">
                {p.shortname}
                {p.status && p.status !== 'Aktiv' && <span className="ml-1 text-[10px] text-muted-foreground">({p.status})</span>}
              </span>
              <span className="w-9 shrink-0">
                {p.rank && <span className="rounded px-1 text-[10px] font-bold" style={rankStyle(p.rank)}>{p.rank}</span>}
              </span>
              <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground"
                title={p.lastmatch != null ? `Senaste match för ${p.lastmatch} dagar sedan` : 'Ingen match än'}>
                {p.lastmatch != null ? `${p.lastmatch}d` : '–'}
              </span>
              <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground" title="Serie- och träningsmatcher under perioden">
                {p.matches}M
              </span>
              <span className={cn('w-9 shrink-0 text-right text-xs tabular-nums', percentClass(pct))} title={`${p.coming} av ${p.total} träningar`}>
                {pct != null ? `${pct}%` : '–'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
    </div>
  )
}
