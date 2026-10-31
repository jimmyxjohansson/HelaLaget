'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useGetPlanningAnswers, useUpdatePlanningAnswer } from '../../hooks/backend/planning'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { Input } from '../../lib/shadcn/input'
import { Button } from '../../lib/shadcn/button'
import { cn } from '../../lib/shadcn/utils'
import { ANSWERS, answerHex, type Kind } from './shared'

/** Alla svar för en match/cup. Tryck på en spelare för att ändra svar och anledning. */
export default function AnswersDialog({
  kind,
  target,
  onClose,
  onChanged,
}: {
  kind: Kind
  target: { id: number; title: string } | null
  onClose: () => void
  onChanged: () => void
}) {
  const answers = useGetPlanningAnswers()
  const update = useUpdatePlanningAnswer()
  const [editing, setEditing] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEditing(null)
    if (target) answers.trigger({ kind, id: target.id }).catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, kind])

  async function save() {
    if (!target || editing == null) return
    setError(null)
    try {
      await update.trigger({ kind, id: target.id, participantId: editing, status, reason })
      setEditing(null)
      await answers.trigger({ kind, id: target.id })
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara.')
    }
  }

  const rows = answers.data ?? []

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[480px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>Svar – {target?.title}</DialogTitle>
        </DialogHeader>
        {answers.loading && rows.length === 0 ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(editing === r.id ? null : r.id)
                    setStatus(r.status ?? 'Förslag')
                    setReason(r.reason ?? '')
                  }}
                  className="flex w-full items-center gap-2 text-left text-sm"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: answerHex(r.status) }} />
                  <span className="w-28 shrink-0 truncate font-medium">{r.shortname}</span>
                  <span className="w-20 shrink-0 text-xs" style={{ color: answerHex(r.status) }}>{r.status}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.reason}</span>
                </button>
                {editing === r.id && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted/60 p-2">
                    <div className="flex flex-wrap gap-1">
                      {ANSWERS.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => setStatus(a.value)}
                          className={cn('rounded-full border px-2 py-0.5 text-xs', status === a.value ? 'text-white' : 'bg-background')}
                          style={status === a.value ? { backgroundColor: a.hex, borderColor: a.hex } : { borderColor: a.hex, color: a.hex }}
                        >
                          {a.value}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Anledning"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && save()}
                      className="bg-background"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Avbryt</Button>
                      <Button size="sm" onClick={save} disabled={update.loading}>
                        {update.loading && <Loader2 className="animate-spin" />} Spara
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Ingen kallad ännu.</li>}
          </ul>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
