'use client'

import { useEffect, useMemo, useState, Fragment, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Save, X, Play, Square, Clock, Hand, Check, Loader2, Flag } from 'lucide-react'
import {
  useGetMatch,
  useSaveMatchEvent,
  useDeleteMatchEvent,
  useUpdateMatchGoalkeeper,
  useFinishMatch,
} from '../hooks/backend/matches'
import { Combobox } from '../components/Combobox'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { RadioGroup, RadioGroupItem } from '../lib/shadcn/radio-group'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/shadcn/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../lib/shadcn/alert-dialog'
import { ownTeamLogoUrl, ownTeamName } from '../utils/constants'

interface MatchData {
  id: number
  matchtype: string
  matchplayers: string | null
  playtime: number | null
  periods: number | null
  opponent: string | null
  opponent_img: string | null
  goalkeeper: number | null
  ourgoals: number
  theirgoals: number
  status: string | null
  outcome: string | null
}

interface Participant {
  id: number
  player: number | null
  shortname: string | null
  firstname: string | null
  lastname: string | null
  img: string | null
  number: number | null
  position: string | null
  status: string | null
}

interface MatchEvent {
  id: number
  goal: number | null
  assist: number | null
  save: number | null
  minute: number | null
  ourgoal: number
  theirgoal: number
  type: string | null
  goal_name: string | null
  assist_name: string | null
  save_name: string | null
}

type GoalType = 'Spelmål' | 'Hörna' | 'Frispark' | 'Straff' | 'Självmål'

const GOAL_TYPES: GoalType[] = ['Spelmål', 'Hörna', 'Frispark', 'Straff', 'Självmål']
const DEFAULT_GOAL_TYPE: GoalType = 'Spelmål'

interface MatchResult {
  match: MatchData | null
  participants: Participant[]
  events: MatchEvent[]
}

type EventKind = 'our_goal' | 'their_goal' | 'save'

interface EventForm {
  id?: number
  kind: EventKind
  minute: string
  goalPlayer: string
  assistPlayer: string
  savePlayer: string
  type: GoalType
}

const KIND_LABEL: Record<EventKind, string> = {
  our_goal: 'Vårt mål',
  their_goal: 'Motståndarmål',
  save: 'Räddning',
}

function classifyEvent(e: MatchEvent): EventKind {
  if (e.save !== null) return 'save'
  // An own goal (Självmål) is recorded without a scorer but still counts for us.
  if (e.goal !== null || e.type === 'Självmål') return 'our_goal'
  return 'their_goal'
}

function emptyForm(): EventForm {
  return {
    kind: 'our_goal',
    minute: '',
    goalPlayer: '',
    assistPlayer: '',
    savePlayer: '',
    type: DEFAULT_GOAL_TYPE,
  }
}

function formFromEvent(e: MatchEvent): EventForm {
  return {
    id: e.id,
    kind: classifyEvent(e),
    minute: e.minute != null ? String(e.minute) : '',
    goalPlayer: e.goal != null ? String(e.goal) : '',
    assistPlayer: e.assist != null ? String(e.assist) : '',
    savePlayer: e.save != null ? String(e.save) : '',
    type: (() => {
      const t = e.type === 'Självmål (motst.)' ? 'Självmål' : e.type
      return t && (GOAL_TYPES as string[]).includes(t) ? (t as GoalType) : DEFAULT_GOAL_TYPE
    })(),
  }
}

export default function MatchTimeline() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const matchId = id ? Number(id) : 0

  const { data, loading, trigger: fetchMatch } = useGetMatch()
  const { loading: saving, trigger: saveEvent } = useSaveMatchEvent()
  const { loading: deleting, trigger: deleteEvent } = useDeleteMatchEvent()
  const { loading: savingGk, trigger: saveGoalkeeper } = useUpdateMatchGoalkeeper()
  const { loading: finishing, trigger: finishMatch } = useFinishMatch()

  const [form, setForm] = useState<EventForm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Set<'goal' | 'save'>>(new Set(['goal']))
  const [goalkeeper, setGoalkeeper] = useState<string>('')
  const [savedGk, setSavedGk] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)

  function toggleFilter(f: 'goal' | 'save') {
    setFilters(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  /** Wall-clock timestamp (ms) when the current period was started, plus its offset and number. */
  const [timer, setTimer] = useState<{ startedAt: number; offsetMinutes: number; periodStartMinutes: number; period: 1 | 2 | 3 } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [customMinute, setCustomMinute] = useState('')

  // Tick the clock every second while a period is running.
  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timer])

  useEffect(() => { if (matchId) fetchMatch({ id: matchId }) }, [matchId])

  const result = data as unknown as MatchResult | undefined
  const match = result?.match
  const participants = result?.participants ?? []
  const events = result?.events ?? []

  // Sync goalkeeper select with the loaded match
  useEffect(() => {
    if (match) {
      setGoalkeeper(match.goalkeeper != null ? String(match.goalkeeper) : '')
    }
  }, [match?.id, match?.goalkeeper])

  // Goalkeeper dropdown only lists participants attending this match (status "Kommer").
  const goalkeeperOptions = useMemo(() => {
    const list = participants
      .filter(p => p.player != null && p.status === 'Kommer')
      .map(p => ({
        value: String(p.player),
        label: p.shortname ?? (`${p.firstname ?? ''} ${p.lastname ?? ''}`.trim() || '–'),
        number: p.number,
      }))
    return list.sort((a, b) => a.label.localeCompare(b.label, 'sv'))
  }, [participants])

  async function handleGoalkeeperChange(value: string) {
    setGoalkeeper(value)
    setSavedGk(false)
    if (!matchId) return
    await saveGoalkeeper({
      id: matchId,
      goalkeeper: value ? Number(value) : null,
    })
    setSavedGk(true)
    setTimeout(() => setSavedGk(false), 1500)
    fetchMatch({ id: matchId }, { skipCache: true })
  }

  const playtime = match?.playtime ?? null
  const periodCount = match?.periods && match.periods > 0 ? match.periods : 1
  const periodList = Array.from({ length: periodCount }, (_, i) => (i + 1) as 1 | 2 | 3)

  // Elapsed time within the current period, in seconds.
  const elapsedMs = timer ? Math.max(0, now - timer.startedAt) : 0
  const elapsedSeconds = Math.floor(elapsedMs / 1000)
  const periodElapsedSeconds = timer ? (timer.offsetMinutes - timer.periodStartMinutes) * 60 + elapsedSeconds : 0
  const totalSeconds = timer ? timer.offsetMinutes * 60 + elapsedSeconds : 0
  const currentMinute = timer ? Math.floor(totalSeconds / 60) : null
  const currentSecond = totalSeconds % 60

  // Period progress: elapsed counting up, remaining counting down.
  const periodTotalSeconds = (playtime ?? 0) * 60
  const periodElapsedClamped = Math.min(periodElapsedSeconds, periodTotalSeconds)
  const periodRemainingSeconds = Math.max(0, periodTotalSeconds - periodElapsedSeconds)
  const periodProgressPct = periodTotalSeconds > 0
    ? Math.min(100, (periodElapsedSeconds / periodTotalSeconds) * 100)
    : 0

  function startPeriod(period: 1 | 2 | 3) {
    if (!playtime && period !== 1) return
    const offset = period === 1 ? 0 : playtime! * (period - 1)
    setTimer({ startedAt: Date.now(), offsetMinutes: offset, periodStartMinutes: offset, period })
    setNow(Date.now())
  }

  function startFromMinute() {
    const minute = Number(customMinute)
    if (customMinute === '' || Number.isNaN(minute) || minute < 0) return
    const period: 1 | 2 | 3 = playtime ? (minute >= playtime * 2 ? 3 : minute >= playtime ? 2 : 1) : 1
    const periodStartMinutes = playtime ? playtime * (period - 1) : 0
    setTimer({ startedAt: Date.now(), offsetMinutes: minute, periodStartMinutes, period })
    setNow(Date.now())
  }

  function stopTimer() {
    setTimer(null)
  }

  // Players who actually played get to appear in the dropdowns.
  const playerOptions = useMemo(() => {
    const seen = new Set<number>()
    const list: { value: string; label: string; number?: number | null }[] = []
    for (const p of participants) {
      if (p.player == null || seen.has(p.player)) continue
      seen.add(p.player)
      list.push({
        value: String(p.player),
        label: p.shortname ?? (`${p.firstname ?? ''} ${p.lastname ?? ''}`.trim() || '–'),
        number: p.number,
      })
    }
    return list.sort((a, b) => a.label.localeCompare(b.label, 'sv'))
  }, [participants])

  // Events shown in the händelser list, newest first, respecting the goal/save filter.
  const orderedEvents = useMemo(() => {
    return events
      .filter(e => {
        const kind = classifyEvent(e)
        return kind === 'save' ? filters.has('save') : filters.has('goal')
      })
      .sort((a, b) => {
        const am = a.minute ?? -1
        const bm = b.minute ?? -1
        if (am !== bm) return bm - am
        return b.id - a.id
      })
  }, [events, filters])

  // Saves grouped per goalkeeper, sorted by most saves.
  const saveSummary = useMemo(() => {
    const counts = new Map<number, { player: number; name: string; img: string | null; count: number }>()
    for (const e of events) {
      if (classifyEvent(e) !== 'save' || e.save == null) continue
      const existing = counts.get(e.save)
      if (existing) {
        existing.count += 1
      } else {
        const p = participants.find(pp => pp.player === e.save)
        counts.set(e.save, {
          player: e.save,
          name: e.save_name ?? p?.shortname ?? '–',
          img: p?.img ?? null,
          count: 1,
        })
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'sv'))
  }, [events, participants])

  function startAdd(kind: EventKind = 'our_goal') {
    setForm({
      ...emptyForm(),
      kind,
      minute: currentMinute != null ? String(currentMinute) : '',
    })
    setError(null)
  }

  function startEdit(e: MatchEvent) {
    setForm(formFromEvent(e))
    setError(null)
  }

  function cancelForm() {
    setForm(null)
    setError(null)
  }

  function setField<K extends keyof EventForm>(field: K, value: EventForm[K]) {
    setForm(prev => (prev ? { ...prev, [field]: value } : prev))
  }

  async function handleSave() {
    if (!form || !matchId) return
    setError(null)

    // Light validation
    if (form.kind === 'our_goal' && form.type !== 'Självmål' && !form.goalPlayer) {
      setError('Välj målskytt.')
      return
    }
    if (form.kind === 'save' && !form.savePlayer) {
      setError('Välj målvakt som räddade.')
      return
    }

    try {
      await saveEvent({
        ...(form.id ? { id: form.id } : {}),
        matchId,
        kind: form.kind,
        minute: form.minute !== '' ? Number(form.minute) : null,
        goalPlayer: form.kind === 'our_goal' && form.goalPlayer ? Number(form.goalPlayer) : null,
        assistPlayer: form.kind === 'our_goal' && form.assistPlayer ? Number(form.assistPlayer) : null,
        savePlayer: form.kind === 'save' && form.savePlayer ? Number(form.savePlayer) : null,
        type: form.kind === 'save' ? null : form.type,
      })
      setForm(null)
      fetchMatch({ id: matchId }, { skipCache: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  async function handleQuickSave() {
    if (!matchId) return
    if (!match?.goalkeeper) {
      setError('Ingen målvakt vald på matchen.')
      return
    }
    setError(null)
    try {
      await saveEvent({
        matchId,
        kind: 'save',
        minute: currentMinute,
        savePlayer: match.goalkeeper,
        goalPlayer: null,
        assistPlayer: null,
      })
      fetchMatch({ id: matchId }, { skipCache: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  async function confirmFinish() {
    if (!matchId) return
    setError(null)
    try {
      await finishMatch({ id: matchId })
      setFinishOpen(false)
      fetchMatch({ id: matchId }, { skipCache: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  async function handleDelete(eventId: number) {
    if (!matchId) return
    if (!window.confirm('Ta bort händelsen?')) return
    try {
      await deleteEvent({ id: eventId, matchId })
      fetchMatch({ id: matchId }, { skipCache: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-4" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-team-accent/80 hover:text-team-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Tillbaka</span>
          </button>
          <button
            onClick={() => setFinishOpen(true)}
            disabled={finishing || match?.status === 'Avslutad'}
            className="flex items-center gap-1.5 rounded-lg bg-team-accent px-3 py-1.5 text-sm font-semibold text-team transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
            {match?.status === 'Avslutad' ? 'Avslutad' : 'Avsluta match'}
          </button>
        </div>
        <h1 className="text-lg font-bold text-team-accent">Tidslinje</h1>
        {match?.opponent && (
          <p className="text-xs text-team-accent/70">vs {match.opponent}</p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-5">
        {/* Timer */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                {timer ? `Period ${timer.period}` : 'Matchtid'}
              </span>
            </div>
            {timer && (
              <button
                onClick={stopTimer}
                className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
              >
                <Square className="w-3.5 h-3.5" />
                Stoppa
              </button>
            )}
          </div>

          <div className="text-center">
            <div className="text-4xl font-black tabular-nums text-foreground">
              {String(Math.floor(totalSeconds / 60)).padStart(2, '0')}
              <span className="text-muted-foreground">:</span>
              {String(currentSecond).padStart(2, '0')}
            </div>
          </div>

          {/* Period progress bar: count up on the left, count down on the right */}
          {timer && periodTotalSeconds > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-s font-semibold tabular-nums text-muted-foreground">
                <span>
                  {String(Math.floor(periodElapsedClamped / 60)).padStart(2, '0')}:{String(periodElapsedClamped % 60).padStart(2, '0')}
                </span>
                <span>
                  -{String(Math.floor(periodRemainingSeconds / 60)).padStart(2, '0')}:{String(periodRemainingSeconds % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-linear"
                  style={{ width: `${periodProgressPct}%`, backgroundColor: 'rgb(var(--team-primary))' }}
                />
              </div>
            </div>
          )}

          {!timer && (
            <div className={`grid gap-2 ${periodCount === 1 ? 'grid-cols-1' : periodCount === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {periodList.map(period => {
                const disabled = period !== 1 && !playtime
                const isActive = false
                return (
                  <button
                    key={period}
                    onClick={() => startPeriod(period)}
                    disabled={disabled}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Period {period}
                    </span>
                    <span className="text-[10px] opacity-80">
                      från {period === 1 ? 0 : (playtime ?? 0) * (period - 1)} min
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Start from a chosen minute */}
          {!timer && (
            <button
              onClick={startFromMinute}
              disabled={customMinute === '' || Number(customMinute) < 0}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                Starta från minut
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={customMinute}
                onClick={e => e.stopPropagation()}
                onChange={e => setCustomMinute(e.target.value)}
                placeholder="0"
                className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </button>
          )}
        </div>

        {/* Quick-add buttons under the timer */}
        {!form && (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center justify-center text-[30px] font-bold text-foreground">
              {match?.ourgoals ?? 0}
            </div>
            <div />
            <div className="flex items-center justify-center text-[30px] font-bold text-foreground">
              {match?.theirgoals ?? 0}
            </div>
            <button
              onClick={() => startAdd('our_goal')}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-muted/60 px-2 py-2.5 text-sm font-semibold text-foreground transition-colors"
              aria-label="Nytt vårt mål"
            >
              <img
                src={ownTeamLogoUrl()}
                alt={ownTeamName()}
                className="w-6 h-6 object-contain"
              />
            </button>
            <button
              onClick={handleQuickSave}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted/60 px-2 py-2.5 text-sm font-semibold text-foreground transition-colors disabled:opacity-50"
              aria-label="Ny räddning"
            >
              <Hand className="w-4 h-4" />
            </button>
            <button
              onClick={() => startAdd('their_goal')}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-muted/60 px-2 py-2.5 text-sm font-semibold text-foreground transition-colors"
              aria-label={`Nytt motståndarmål${match?.opponent ? ` (${match.opponent})` : ''}`}
            >
              {match?.opponent_img ? (
                <img
                  src={match.opponent_img}
                  alt={match.opponent ?? 'Motståndare'}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {(match?.opponent ?? '?').slice(0, 1)}
                </span>
              )}
            </button>
          </div>
        )}

        {!form && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {loading && !result && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {form && (
          <Section title={form.id ? 'Redigera händelse' : 'Ny händelse'}>
            <Field label="Typ">
              <Select
                value={form.kind}
                onValueChange={v => setField('kind', v as EventKind)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="our_goal">{KIND_LABEL.our_goal}</SelectItem>
                  <SelectItem value="their_goal">{KIND_LABEL.their_goal}</SelectItem>
                  <SelectItem value="save">{KIND_LABEL.save}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {form.kind !== 'save' && (
              <Field label="Måltyp">
                <RadioGroup
                  value={form.type}
                  onValueChange={v => setField('type', v as GoalType)}
                  className="grid grid-cols-2 gap-2"
                >
                  {GOAL_TYPES.map(t => {
                    const id = `goal-type-${t}`
                    const selected = form.type === t
                    return (
                      <label
                        key={t}
                        htmlFor={id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-foreground/40'
                        }`}
                      >
                        <RadioGroupItem id={id} value={t} />
                        <span>{t}</span>
                      </label>
                    )
                  })}
                </RadioGroup>
              </Field>
            )}

            <Field label="Minut">
              <Input
                type="number"
                min={0}
                value={form.minute}
                onChange={e => setField('minute', e.target.value)}
                placeholder="t.ex. 23"
              />
            </Field>

            {form.kind === 'our_goal' && (
              <>
                <Field label="Målskytt">
                  <Combobox
                    options={playerOptions}
                    value={form.goalPlayer}
                    onValueChange={v => setField('goalPlayer', v)}
                    placeholder="Välj spelare..."
                    emptyMessage="Inga spelare."
                    className="w-full"
                  />
                </Field>
                <Field label="Assist (valfritt)">
                  <Combobox
                    options={playerOptions}
                    value={form.assistPlayer}
                    onValueChange={v => setField('assistPlayer', v)}
                    placeholder="Välj spelare..."
                    emptyMessage="Inga spelare."
                    className="w-full"
                  />
                </Field>
              </>
            )}

            {form.kind === 'save' && (
              <Field label="Räddade av">
                <Combobox
                  options={playerOptions}
                  value={form.savePlayer}
                  onValueChange={v => setField('savePlayer', v)}
                  placeholder="Välj spelare..."
                  emptyMessage="Inga spelare."
                  className="w-full"
                />
              </Field>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
                style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Sparar…' : form.id ? 'Spara' : 'Lägg till'}
              </Button>
              <Button variant="outline" onClick={cancelForm} disabled={saving}>
                <X className="w-4 h-4 mr-1" />
                Avbryt
              </Button>
            </div>
          </Section>
        )}

        <Section title={`Händelser (${orderedEvents.length})`}>
          <div className="flex gap-2 mb-3">
            {([
              { key: 'goal' as const, label: 'Mål' },
              { key: 'save' as const, label: 'Räddningar' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => toggleFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  filters.has(f.key)
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {orderedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              Inga händelser ännu. Lägg till den första via knappen ovan.
            </p>
          ) : (
            <div className="relative">
              {/* Vertical spine */}
              <div className="absolute left-1/2 top-2 bottom-2 w-px bg-border -translate-x-1/2 z-0" />

              <div className="flex flex-col divide-y divide-border/40">
                {orderedEvents.map((e, i) => {
                  const kind = classifyEvent(e)
                  const isOurs = kind === 'our_goal' || kind === 'save'
                  const isTheirs = kind === 'their_goal'
                  const isSave = kind === 'save'

                  // Period this event belongs to, and whether it opens a new period
                  // block in the descending (newest-first) list.
                  const eventPeriod = playtime && e.minute != null
                    ? Math.min(periodCount, Math.floor(e.minute / playtime) + 1)
                    : 1
                  const prev = orderedEvents[i - 1]
                  const prevPeriod = prev && playtime && prev.minute != null
                    ? Math.min(periodCount, Math.floor(prev.minute / playtime) + 1)
                    : null
                  const showDivider = periodCount > 1 && eventPeriod !== prevPeriod

                  return (
                    <Fragment key={e.id}>
                      {showDivider && (
                        <div className="relative z-10 flex items-center gap-3 py-2 bg-card">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                            Period {eventPeriod}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div
                        className="relative grid grid-cols-[1fr_52px_1fr] items-center py-1 z-10 cursor-pointer hover:bg-muted/40 transition-colors rounded-md"
                        onClick={() => startEdit(e)}
                      >
                      {/* Left — our content */}
                      <div className="pr-2 pl-8 flex flex-col items-end gap-0">
                        {isOurs && (
                          <>
                            <span className="text-[14px] font-semibold text-foreground text-right leading-tight">
                              {isSave
                                ? <>{e.save_name} 🧤</>
                                : (e.goal_name ?? '')}
                            </span>
                            {!isSave && e.assist_name && (
                              <span className="text-[12px] text-muted-foreground text-right leading-tight">
                                {e.assist_name}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Center — logo + minute + score */}
                      <div className="flex flex-col items-center gap-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-border">
                          {isTheirs ? (
                            match?.opponent_img
                              ? <img src={match.opponent_img} alt={match.opponent ?? ''} className="w-full h-full object-contain" />
                              : <span className="text-[12px] font-bold text-muted-foreground">{(match?.opponent ?? '?')[0]}</span>
                          ) : (
                            <img
                              src={ownTeamLogoUrl()}
                              alt={ownTeamName()}
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <span className="text-[12px] font-mono text-muted-foreground leading-tight">
                          {e.minute != null ? `${e.minute}'` : '–'}
                        </span>
                        {!isSave && (
                          <span className="text-[12px] font-bold text-foreground tabular-nums leading-tight">
                            {e.ourgoal}–{e.theirgoal}
                          </span>
                        )}
                      </div>

                      {/* Right — their content + delete */}
                      <div className="pl-2 pr-8 flex flex-col items-start gap-0">
                        {isTheirs && (
                          <span className="text-xs font-semibold text-muted-foreground leading-tight">
                            {match?.opponent ?? '–'}
                          </span>
                        )}
                      </div>

                      {/* Delete affordance, absolute so it doesn't shift the timeline columns */}
                      <button
                        onClick={ev => { ev.stopPropagation(); handleDelete(e.id) }}
                        disabled={deleting}
                        className="absolute top-1 right-1 text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted transition-colors disabled:opacity-50"
                        aria-label="Ta bort"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      </div>
                    </Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </Section>

        <Section title={`Räddningar (${saveSummary.reduce((s, r) => s + r.count, 0)})`}>
          {saveSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              Inga räddningar registrerade.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border/40">
              {saveSummary.map(s => (
                <div key={s.player} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                    {s.img ? (
                      <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <Hand className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{s.name}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Målvakt">
          <Field
            label="Målvakt för matchen"
            hint={
              savingGk
                ? <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Sparar…</span>
                : savedGk
                ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><Check className="w-3 h-3" /> Sparat</span>
                : null
            }
          >
            <Combobox
              options={goalkeeperOptions}
              value={goalkeeper}
              onValueChange={handleGoalkeeperChange}
              placeholder="Välj målvakt…"
              searchPlaceholder="Sök spelare…"
              emptyMessage="Inga spelare hittades."
              className="w-full"
            />
          </Field>
        </Section>

        <div className="h-4" />
      </div>

      {/* Finish confirm */}
      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta match?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill avsluta matchen? Status sätts till ”Avslutad” och
              resultatet räknas ut. Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finishing}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmFinish() }}
              disabled={finishing}
            >
              {finishing ? 'Avslutar...' : 'Avsluta match'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <span className="text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
