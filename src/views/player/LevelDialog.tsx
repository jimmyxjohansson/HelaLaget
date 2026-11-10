'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, History, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { Button } from '../../lib/shadcn/button'
import { Textarea } from '../../lib/shadcn/textarea'
import { cn } from '../../lib/shadcn/utils'
import { useGetLevelAssessments, useSaveLevelAssessment } from '../../hooks/backend/levels'
import { rankStyle } from '../../utils/rankColors'
import { GRADES, areaScore, gradeOf, ratedKeys, suggestLevel, type Grade, type Matrix, type Scores } from '../../utils/levelMatrix'

const RANKS = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D']
const DATE = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' })

/** Beräkna nivå: bedöm spelaren enligt nivåmatrisen och få en föreslagen nivå att sätta. */
export default function LevelDialog({ open, onClose, player, onApplied, matrix }: {
  open: boolean
  matrix: Matrix
  onClose: () => void
  player: { id: number; name: string; rank: string | null }
  onApplied: () => void
}) {
  const history = useGetLevelAssessments()
  const save = useSaveLevelAssessment()
  const [scores, setScores] = useState<Scores>({})
  const [comment, setComment] = useState('')
  const [rank, setRank] = useState<string | null>(null)
  const [rankTouched, setRankTouched] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  // Förra bedömningen fylls i som start
  useEffect(() => {
    if (!open) return
    setError(null)
    setDone(null)
    setComment('')
    setRankTouched(false)
    setShowHistory(false)
    history.trigger({ playerId: player.id }, { skipCache: true })
      .then((list) => setScores((list?.find((h) => !h.matrix || h.matrix === matrix.key)?.scores ?? {}) as Scores))
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player.id])

  const suggestion = useMemo(() => suggestLevel(matrix, scores), [matrix, scores])
  useEffect(() => {
    if (!rankTouched) setRank(suggestion?.level ?? null)
  }, [suggestion?.level, rankTouched])

  const missing = ratedKeys(matrix).filter((k) => !scores[k]).length
  const last = history.data?.find((h) => !h.matrix || h.matrix === matrix.key)

  async function submit(apply: boolean) {
    setError(null)
    try {
      const r = await save.trigger({ playerId: player.id, scores, applyRank: apply ? rank : null, comment })
      setDone(r.applied ? `Nivån är satt till ${r.applied}.` : 'Bedömningen är sparad.')
      if (r.applied) onApplied()
      history.trigger({ playerId: player.id }, { skipCache: true }).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-[760px] overflow-y-auto px-3 pb-0 sm:px-5">
        <DialogHeader>
          <DialogTitle className="pr-6">Beräkna nivå: {player.name}</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{matrix.name}</span>
          <span className="text-muted-foreground">Nuvarande nivå: <b className="text-foreground">{player.rank ?? 'ingen'}</b></span>
        </p>
        <p className="text-sm text-muted-foreground">
          Matrisen är gjord för barn {matrix.ages}. Välj den beskrivning som stämmer bäst för varje del. {matrix.intro}
        </p>
        {last && (
          <p className="text-xs text-muted-foreground">
            Ifyllt från senaste bedömningen {DATE.format(new Date(last.created_at))}{last.by ? ` av ${last.by}` : ''}.
          </p>
        )}

        <div className="flex flex-col gap-5">
          {matrix.areas.map((area) => {
            const s = areaScore(area, scores)
            return (
              <section key={area.key} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                  <h3 className="text-sm font-semibold">
                    {area.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {area.weight ? `${Math.round(area.weight * 100)} %` : 'räknas inte'}
                    </span>
                  </h3>
                  {s != null && <span className="text-xs text-muted-foreground">Snitt {gradeOf(s)}</span>}
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">{area.note}</p>
                {area.criteria.map((c) => (
                  <div key={c.key} className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium">{c.name}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {GRADES.map((g: Grade) => {
                        const on = scores[c.key] === g
                        return (
                          <button key={g} type="button" aria-pressed={on}
                            onClick={() => { setDone(null); setScores({ ...scores, [c.key]: on ? undefined : g }) }}
                            className={cn('flex items-start gap-2 rounded-lg border p-2 text-left text-xs leading-snug transition-colors',
                              on ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted')}>
                            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold" style={rankStyle(g)}>{g}</span>
                            <span className={on ? 'text-foreground' : 'text-muted-foreground'}>{c.levels[g]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )
          })}

          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Kommentar <span className="font-normal text-muted-foreground">(valfritt)</span></p>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500}
              placeholder="T.ex. vilka ledare som är överens" />
          </div>

          {history.data && history.data.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground">
                <History className="h-3.5 w-3.5" /> Tidigare bedömningar ({history.data.length})
              </button>
              {showHistory && (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border text-xs">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex flex-col gap-0.5 px-3 py-2">
                      <span>
                        {DATE.format(new Date(h.created_at))}{h.by ? ` · ${h.by}` : ''} · förslag <b>{h.suggested}</b>
                        {h.matrix && h.matrix !== matrix.key && <> · annan matris</>}
                        {h.applied_rank && <> · satte <b>{h.applied_rank}</b></>}
                      </span>
                      {h.comment && <span className="text-muted-foreground">{h.comment}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Resultatet står kvar längst ner medan man fyller i */}
        <div className="sticky bottom-0 -mx-3 mt-2 flex flex-col gap-2 border-t border-border bg-background px-3 py-3 sm:-mx-5 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {suggestion ? (
              <>
                <span>Föreslagen nivå</span>
                <span className="rounded-full px-2.5 py-0.5 text-sm font-bold" style={rankStyle(suggestion.level)}>{suggestion.level}</span>
                <span className="text-xs text-muted-foreground">
                  {matrix.areas.filter((a) => a.weight).map((a) => {
                    const s = areaScore(a, scores)
                    return `${a.name} ${s != null ? gradeOf(s) : '–'}`
                  }).join(' · ')}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Fyll i {missing} {missing === 1 ? 'del' : 'delar'} till under fotbollsaktioner och fysik för att få ett förslag.</span>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {done && <p className="flex items-center gap-1 text-sm text-success"><Check className="h-4 w-4" /> {done}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Nivå att sätta" value={rank ?? ''} disabled={!suggestion}
              onChange={(e) => { setRankTouched(true); setRank(e.target.value || null) }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm">
              {RANKS.map((r) => <option key={r} value={r}>{r}{r === suggestion?.level ? ' (förslag)' : ''}</option>)}
            </select>
            <Button onClick={() => submit(true)} disabled={!suggestion || !rank || save.loading}>
              {save.loading && <Loader2 className="animate-spin" />}
              Sätt nivå {rank ?? ''}
            </Button>
            <Button variant="outline" onClick={() => submit(false)} disabled={!suggestion || save.loading}>
              Spara utan att ändra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
