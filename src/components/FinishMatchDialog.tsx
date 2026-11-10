'use client'

import { useEffect, useState } from 'react'
import { Loader2, Minus, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../lib/shadcn/dialog'
import { Button } from '../lib/shadcn/button'
import { cn } from '../lib/shadcn/utils'
import { useFinishMatch } from '../hooks/backend/matches'

const OUTCOMES = [
  { value: 'Vinst', color: '#16a34a' },
  { value: 'Oavgjort', color: '#d97706' },
  { value: 'Förlust', color: '#dc2626' },
]
const fromGoals = (a: number, b: number) => (a > b ? 'Vinst' : a < b ? 'Förlust' : 'Oavgjort')

/** Avsluta match: utfall, våra mål och deras mål. Utfallet följer målen tills man väljer själv. */
export default function FinishMatchDialog({ open, onClose, match, onFinished }: {
  open: boolean
  onClose: () => void
  match: { id: number; vs: string | null; ourgoals: number | null; theirgoals: number | null; outcome: string | null }
  onFinished: () => void
}) {
  const finish = useFinishMatch()
  const [ours, setOurs] = useState(0)
  const [theirs, setTheirs] = useState(0)
  const [outcome, setOutcome] = useState('Oavgjort')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const a = match.ourgoals ?? 0
    const b = match.theirgoals ?? 0
    setOurs(a)
    setTheirs(b)
    const known = OUTCOMES.some((o) => o.value === match.outcome)
    setOutcome(known ? match.outcome! : fromGoals(a, b))
    setTouched(known && match.outcome !== fromGoals(a, b))
    setError(null)
  }, [open, match.id])

  useEffect(() => {
    if (!touched) setOutcome(fromGoals(ours, theirs))
  }, [ours, theirs, touched])

  async function save() {
    setError(null)
    try {
      await finish.trigger({ id: match.id, ourgoals: ours, theirgoals: theirs, outcome })
      onFinished()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte avsluta matchen.')
    }
  }

  const stepper = (label: string, value: number, set: (n: number) => void) => (
    <div className="flex flex-1 flex-col items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" aria-label={`Minska ${label}`} onClick={() => set(Math.max(0, value - 1))} disabled={value <= 0}>
          <Minus />
        </Button>
        <input type="number" inputMode="numeric" min={0} max={99} value={value} aria-label={label}
          onChange={(e) => set(Math.max(0, Math.min(99, Number(e.target.value.replace(/\D/g, '')) || 0)))}
          className="h-12 w-14 rounded-md border border-border bg-background text-center text-2xl font-bold tabular-nums" />
        <Button type="button" size="icon" variant="outline" aria-label={`Öka ${label}`} onClick={() => set(Math.min(99, value + 1))}>
          <Plus />
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle>Avsluta match{match.vs ? ` mot ${match.vs}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3">
          {stepper('Våra mål', ours, setOurs)}
          {stepper('Deras mål', theirs, setTheirs)}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Utfall</span>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {OUTCOMES.map((o) => (
              <button key={o.value} type="button" aria-pressed={outcome === o.value}
                onClick={() => { setTouched(true); setOutcome(o.value) }}
                className={cn('flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                  outcome === o.value ? 'text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                style={outcome === o.value ? { backgroundColor: o.color } : undefined}>
                {o.value}
              </button>
            ))}
          </div>
          {touched && outcome !== fromGoals(ours, theirs) && (
            <p className="text-xs text-muted-foreground">Utfallet stämmer inte med målen (t.ex. vid straffar eller w.o.).</p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={save} disabled={finish.loading}>
            {finish.loading && <Loader2 className="animate-spin" />} Avsluta match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
