'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Plus, RefreshCw } from 'lucide-react'
import { useAddPlanningPlayers, useGetPlanningCandidates } from '../../hooks/backend/planning'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { cn } from '../../lib/shadcn/utils'
import { byGender } from '../../utils/gender'
import { answerHex, percentClass, rankIndex, type Kind } from './shared'
import { rankStyle } from '../../utils/rankColors'
import { defaultCount, rankGroup, suggestPlayers, type SuggestOptions } from './suggest'

const STORE = 'hl-plan-suggest'
const WEIGHT_LABELS = ['Inte alls', 'Lite', 'Mycket', 'Mest']
const MIN_ATTENDANCE = [0, 25, 50, 60, 75]

type Saved = Pick<SuggestOptions, 'mode' | 'weights' | 'minAttendance' | 'balanceGender'> & { excludeOthers: boolean }
const DEFAULTS: Saved = { mode: 'mixed', weights: { games: 3, recent: 2, attendance: 1 }, minAttendance: 50, balanceGender: true, excludeOthers: true }

function loadSaved(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    return v ? { ...DEFAULTS, ...v, weights: { ...DEFAULTS.weights, ...v.weights } } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

/**
 * Föreslå spelare till en match eller cup: välj antal, målvakter, nivå eller blandat
 * och vad som ska väga mest. Förslaget läggs till med status Förslag.
 */
export default function SuggestDialog({
  open, kind, eventId, title, matchplayers, otherEventIds, from, periodLabel, playerStatuses, genders, mixed, onClose, onAdded,
}: {
  open: boolean
  kind: Kind
  eventId: number
  title: string
  /** Spelformen, t.ex. "9 v 9", för förvalt antal */
  matchplayers: string | null
  /** Matcher/cuper i de andra kolumnerna */
  otherEventIds: number[]
  from: string | null
  periodLabel: string
  playerStatuses: string[]
  genders: string[]
  mixed: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const candidates = useGetPlanningCandidates()
  const add = useAddPlanningPlayers()
  const [saved, setSaved] = useState<Saved>(DEFAULTS)
  const [count, setCount] = useState(defaultCount(matchplayers))
  const [keepers, setKeepers] = useState(1)
  const [ranks, setRanks] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const eventIds = saved.excludeOthers ? [eventId, ...otherEventIds] : [eventId]

  useEffect(() => {
    if (!open) return
    setSaved(loadSaved())
    setCount(defaultCount(matchplayers))
    setKeepers(kind === 'cup' ? 2 : 1)
    setExcluded(new Set())
    setUnchecked(new Set())
    setError(null)
    setDone(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId])

  useEffect(() => {
    if (!open) return
    candidates.trigger({ kind, eventIds, from, playerStatuses }, { skipCache: true }).catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventIds.join(','), from, playerStatuses.join(','), kind])

  function update(patch: Partial<Saved>) {
    setSaved((s) => {
      const next = { ...s, ...patch, weights: { ...s.weights, ...patch.weights } }
      try { localStorage.setItem(STORE, JSON.stringify(next)) } catch { /* ingen lagring */ }
      return next
    })
    setExcluded(new Set())
    setUnchecked(new Set())
  }

  const pool = useMemo(() => byGender(candidates.data ?? [], genders), [candidates.data, genders])
  const availableRanks = useMemo(
    () => Array.from(new Set(pool.map((p) => (p.rank ?? '').toUpperCase()).filter(Boolean))).sort((a, b) => rankIndex(a) - rankIndex(b)),
    [pool],
  )
  // Nivå: förvalt alla rank tills man väljer själv
  const chosenRanks = ranks.length ? ranks : availableRanks

  const suggestion = useMemo(
    () => suggestPlayers(pool, { ...saved, count, keepers, ranks: chosenRanks, balanceGender: mixed && saved.balanceGender }, excluded),
    [pool, saved, count, keepers, chosenRanks, mixed, excluded],
  )
  const picked = suggestion.filter((s) => !unchecked.has(s.id))
  const keepersFound = suggestion.filter((s) => s.keeper).length

  function replaceUnchecked() {
    setExcluded((e) => new Set([...e, ...unchecked]))
    setUnchecked(new Set())
  }

  async function addAll() {
    setError(null)
    try {
      const r = await add.trigger({
        kind, id: eventId,
        playerIds: picked.map((p) => p.id),
        goalkeeperIds: picked.filter((p) => p.keeper).map((p) => p.id),
      })
      setDone(`${r.added} spelare tillagda som förslag i ${title}.`)
      onAdded()
      setExcluded(new Set())
      setUnchecked(new Set())
      await candidates.trigger({ kind, eventIds, from, playerStatuses }, { skipCache: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  const groupCounts = ['A', 'B', 'C', 'D'].map((g) => [g, picked.filter((p) => rankGroup(p.rank) === g).length] as const).filter(([, n]) => n)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[560px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>Föreslå spelare · {title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Antal spelare</span>
              <Stepper value={count} min={1} max={30} onChange={(v) => { setCount(v); setExcluded(new Set()) }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Varav målvakter</span>
              <Stepper value={keepers} min={0} max={3} onChange={(v) => { setKeepers(v); setExcluded(new Set()) }} />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Urval</span>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {([['mixed', 'Blandat'], ['level', 'Efter nivå']] as const).map(([m, label]) => (
                <button key={m} type="button" onClick={() => update({ mode: m })}
                  className={cn('flex-1 rounded-md px-2 py-1 text-sm font-medium', saved.mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                  {label}
                </button>
              ))}
            </div>
            {saved.mode === 'level' && (
              <div className="flex flex-wrap items-center gap-1.5">
                {availableRanks.map((r) => {
                  const on = chosenRanks.includes(r)
                  return (
                    <button key={r} type="button" aria-pressed={on}
                      onClick={() => { setRanks(on ? chosenRanks.filter((x) => x !== r) : [...chosenRanks, r]); setExcluded(new Set()) }}
                      className={cn('rounded-full border px-2 py-0.5', on ? 'border-primary bg-primary/10' : 'border-border opacity-50')}>
                      <RankBadge rank={r} />
                    </button>
                  )
                })}
                <span className="text-xs text-muted-foreground">Tryck för att välja nivåer</span>
              </div>
            )}
            {saved.mode === 'mixed' && <p className="text-xs text-muted-foreground">Turvis ur A, B, C och D så att nivåerna blir jämnt fördelade.</p>}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Vad ska väga mest? Period: <b className="text-foreground">{periodLabel}</b> (filtret på planeringen)</p>
            <Weight label="Spelat få matcher och cuper" value={saved.weights.games} onChange={(v) => update({ weights: { ...saved.weights, games: v } })} />
            <Weight label="Länge sedan senaste match" value={saved.weights.recent} onChange={(v) => update({ weights: { ...saved.weights, recent: v } })} />
            <Weight label="Hög träningsnärvaro" value={saved.weights.attendance} onChange={(v) => update({ weights: { ...saved.weights, attendance: v } })} />
            <label className="flex items-center justify-between gap-2">
              <span>Lägsta träningsnärvaro</span>
              <select value={saved.minAttendance} onChange={(e) => update({ minAttendance: Number(e.target.value) })}
                className="rounded-md border border-border bg-background px-2 py-1">
                {MIN_ATTENDANCE.map((m) => <option key={m} value={m}>{m ? `${m} %` : 'Inget krav'}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={saved.excludeOthers} onChange={(e) => update({ excludeOthers: e.target.checked })} />
              Hoppa över spelare som är kallade till de andra kolumnernas {kind === 'match' ? 'matcher' : 'cuper'}
            </label>
            {mixed && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={saved.balanceGender} onChange={(e) => update({ balanceGender: e.target.checked })} />
                Jämn fördelning mellan pojkar och flickor
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Förslag ({picked.length}{groupCounts.length > 1 ? ` · ${groupCounts.map(([g, n]) => `${n} ${g}`).join(', ')}` : ''})
              </p>
              {unchecked.size > 0 && (
                <button type="button" onClick={replaceUnchecked}
                  className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted">
                  <RefreshCw className="h-3 w-3" /> Byt ut {unchecked.size}
                </button>
              )}
            </div>
            {candidates.loading && !candidates.data ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : suggestion.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen spelare passar valen.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {suggestion.map((p) => {
                  const off = unchecked.has(p.id)
                  const games = [p.matches ? `${p.matches} ${p.matches === 1 ? 'match' : 'matcher'}` : '0 matcher', p.cups ? `${p.cups} ${p.cups === 1 ? 'cup' : 'cuper'}` : null].filter(Boolean).join(', ')
                  return (
                    <li key={p.id}>
                      <label className={cn('flex cursor-pointer items-center gap-2 px-2.5 py-1.5', off && 'opacity-50')}>
                        <input type="checkbox" checked={!off}
                          onChange={() => setUnchecked((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n })} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{p.shortname}</span>
                            {p.keeper && <span className="rounded bg-green-600 px-1 text-[10px] font-semibold text-white">MV</span>}
                            {mixed && p.gender && <span className="text-[11px] text-muted-foreground">{p.gender === 'Flicka' ? 'F' : 'P'}</span>}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {games} · {p.lastmatch == null ? 'ingen match än' : `${p.lastmatch} d sedan senaste`}
                          </span>
                        </span>
                        <RankBadge rank={p.rank} />
                        <span className={cn('w-10 text-right text-xs tabular-nums', percentClass(p.pct))}>{p.pct == null ? '–' : `${p.pct}%`}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            {keepers > keepersFound && suggestion.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {keepersFound === 0 ? 'Ingen målvakt' : `Bara ${keepersFound} målvakt`} passar valen. Målvakter är de som har positionen Målvakt på spelarkortet.
              </p>
            )}
            {suggestion.length > 0 && suggestion.length < count && (
              <p className="text-xs text-muted-foreground">Bara {suggestion.length} spelare passar valen.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {done && <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400"><Check className="h-4 w-4" /> {done}</p>}

          <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-background px-4 pt-3">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Stäng</button>
            <button type="button" onClick={addAll} disabled={picked.length === 0 || add.loading}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: answerHex('Förslag') }}>
              {add.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Lägg till {picked.length} som förslag
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-border">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        className="px-3 py-1.5 text-base hover:bg-muted disabled:opacity-40" aria-label="Färre">−</button>
      <span className="flex-1 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        className="px-3 py-1.5 text-base hover:bg-muted disabled:opacity-40" aria-label="Fler">+</button>
    </div>
  )
}

function Weight({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 sm:grid-cols-[1fr_140px_56px]">
      <span>{label}</span>
      <span className="text-right text-xs text-muted-foreground sm:order-3">{WEIGHT_LABELS[value]}</span>
      <input type="range" min={0} max={3} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="col-span-2 accent-primary sm:order-2 sm:col-span-1" aria-label={label} />
    </label>
  )
}

function RankBadge({ rank }: { rank: string | null }) {
  return rank ? <span className="rounded px-1 text-[10px] font-bold" style={rankStyle(rank)}>{rank}</span> : <span className="text-[10px] text-muted-foreground">–</span>
}
