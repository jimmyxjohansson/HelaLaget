'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { callBackend } from '../../hooks/backend/_core'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import type { SlotEvent, SlotPlayer } from '../../server/functions/planning/getPlanningSlot'
import { formatCupDates, formatWhen, type Kind } from './shared'

type Slot = { event: SlotEvent; players: SlotPlayer[] }

/**
 * Fogis-/cupsummering: alla som kommer, med nummer, fullständigt namn och
 * födelsedatum, för de valda matcherna/cuperna. Kan kopieras som tabell.
 */
export default function SummaryDialog({
  kind,
  eventIds,
  open,
  onClose,
}: {
  kind: Kind
  eventIds: number[]
  open: boolean
  onClose: () => void
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const key = eventIds.join(',')

  useEffect(() => {
    if (!open) return
    setSlots(null)
    setError(null)
    Promise.all(eventIds.map((id) => callBackend<Slot>('planning/getPlanningSlot', { kind, id, from: null })))
      .then(setSlots)
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, kind])

  function coming(s: Slot) {
    return s.players
      .filter((p) => p.status === 'Kommer')
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || (a.fullname ?? '').localeCompare(b.fullname ?? '', 'sv'))
  }

  async function copy(s: Slot) {
    const text = coming(s)
      .map((p) => [p.number ?? '', `${p.fullname ?? p.shortname ?? ''}${p.position === 'Målvakt' ? ' (MV)' : ''}`, p.birthdate?.slice(0, 10) ?? ''].join('\t'))
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(s.event.id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setError('Kunde inte kopiera. Markera tabellen och kopiera själv.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[640px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>{kind === 'match' ? 'Fogis-summering' : 'Cupsummering'}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!slots && !error ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          (slots ?? []).map((s) => {
            const rows = coming(s)
            return (
              <section key={s.event.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{s.event.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {kind === 'match' ? formatWhen(s.event.date) : formatCupDates(s.event.date, s.event.enddate)} · {rows.length} kommer
                    </p>
                  </div>
                  <button type="button" onClick={() => copy(s)} disabled={rows.length === 0}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
                    {copied === s.event.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === s.event.id ? 'Kopierat' : 'Kopiera'}
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="w-10 py-1 font-medium">#</th>
                      <th className="py-1 font-medium">Namn</th>
                      <th className="w-28 py-1 font-medium">Född</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-1 tabular-nums">{p.number ?? ''}</td>
                        <td className="py-1">
                          {p.fullname ?? p.shortname}
                          {p.position === 'Målvakt' && <span className="ml-1 text-xs font-semibold text-sky-700 dark:text-sky-300">(MV)</span>}
                        </td>
                        <td className="py-1 tabular-nums">{p.birthdate?.slice(0, 10) ?? ''}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={3} className="py-2 text-xs text-muted-foreground">Ingen har svarat Kommer ännu.</td></tr>
                    )}
                  </tbody>
                </table>
              </section>
            )
          })
        )}
      </DialogContent>
    </Dialog>
  )
}
