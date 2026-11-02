'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useGetDrill } from '../../hooks/backend/drills'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { Button } from '../../lib/shadcn/button'
import { DrillContent } from './DrillDetail'

/**
 * Hela övningen i en popup: ritning, nivåer, organisation och
 * coachningspunkter. Med onPick går övningen att välja direkt härifrån.
 */
export default function DrillPreview({ drillId, initialLevel = null, onClose, onPick, pickLabel = 'Välj övningen' }: {
  drillId: number | null
  /** Nivån som visas först, t.ex. den som valts i träningsplanen */
  initialLevel?: string | null
  onClose: () => void
  onPick?: () => void
  pickLabel?: string
}) {
  const q = useGetDrill()
  const [level, setLevel] = useState<string | null>(null)

  useEffect(() => {
    if (drillId == null) return
    setLevel(initialLevel)
    q.trigger({ id: drillId }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillId])

  const d = q.data && q.data.id === drillId ? q.data : null

  return (
    <Dialog open={drillId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-3 overflow-hidden p-4">
        <DialogHeader>
          <DialogTitle>{d?.name ?? 'Övning'}</DialogTitle>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {!d ? (
            q.error
              ? <p className="py-8 text-center text-sm text-destructive">{q.error.message}</p>
              : <Loader2 className="mx-auto my-10 h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <DrillContent drill={d} level={level} onLevel={setLevel} />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={onClose}>{onPick ? 'Tillbaka' : 'Stäng'}</Button>
          {onPick && (
            <Button onClick={onPick} disabled={!d}>
              <Check className="h-4 w-4" /> {pickLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
