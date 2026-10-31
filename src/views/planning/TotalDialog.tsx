'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { useAddPlanningPlayers, useGetPlanningCandidates } from '../../hooks/backend/planning'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { CandidateList } from './SlotColumn'
import { answerHex, type Kind } from './shared'

/** Spelare som inte är kallade till någon av kolumnernas matcher/cuper. */
export default function TotalDialog({
  kind,
  slots,
  open,
  from,
  playerStatuses,
  onClose,
  onChanged,
}: {
  kind: Kind
  slots: { index: number; id: number; title: string }[]
  open: boolean
  from: string | null
  playerStatuses: string[]
  onClose: () => void
  onChanged: () => void
}) {
  const candidates = useGetPlanningCandidates()
  const add = useAddPlanningPlayers()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const ids = slots.map((s) => s.id)
  const key = `${ids.join(',')}|${from}|${playerStatuses.join(',')}`

  function load() {
    return candidates.trigger({ kind, eventIds: ids, from, playerStatuses }).catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setError(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, kind])

  async function addTo(id: number) {
    setError(null)
    try {
      await add.trigger({ kind, id, playerIds: Array.from(selected) })
      setSelected(new Set())
      await load()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  const rows = candidates.data ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[520px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>Ej kallade till någon {kind === 'match' ? 'match' : 'cup'} ({rows.length})</DialogTitle>
        </DialogHeader>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 bg-background pb-2">
          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">Välj {kind === 'match' ? 'matcher' : 'cuper'} i kolumnerna först.</p>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {selected.size > 0 ? `Lägg ${selected.size} som förslag i:` : 'Markera spelare och lägg dem i:'}
              </span>
              {slots.map((s) => (
                <button key={s.id} type="button" disabled={selected.size === 0 || add.loading} onClick={() => addTo(s.id)}
                  className="flex max-w-[11rem] items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: answerHex('Förslag') }} title={s.title}>
                  <Plus className="h-3 w-3 shrink-0" /> <span className="truncate">{s.index + 1}. {s.title}</span>
                </button>
              ))}
            </>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {candidates.loading && rows.length === 0 ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <CandidateList rows={rows} selected={selected}
            onToggle={(id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })} />
        )}
      </DialogContent>
    </Dialog>
  )
}
