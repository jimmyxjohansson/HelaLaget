'use client'

import { useEffect, useState } from 'react'
import { Clock, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { useGetDrills } from '../../hooks/backend/drills'
import { LEVEL_COLOR } from '../../utils/drills'

type SummaryBlocks = {
  name: string
  minutes?: number | null
  notes?: string | null
  items: { groupName?: string | null; drillId?: number | null; title?: string | null; level?: string | null; notes?: string | null }[]
}[]

export type SummaryTemplate = { name: string; blocks: unknown }

/** "i"-knapp som öppnar en sammanfattning av mallen. */
export function TemplateInfoButton({ onClick, name }: { onClick: () => void; name: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Visa sammanfattning av ${name}`} title="Visa sammanfattning"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
      <Info className="h-4 w-4" />
    </button>
  )
}

/** Sammanfattning av en träningsplansmall: block, tid och övningar. */
export default function TemplateSummary({ template, onClose, action }: {
  template: SummaryTemplate | null
  onClose: () => void
  /** T.ex. en Använd-knapp längst ner */
  action?: React.ReactNode
}) {
  const drills = useGetDrills()
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (template && !drills.data && !loaded) {
      setLoaded(true)
      drills.trigger().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  const blocks = (template?.blocks ?? []) as SummaryBlocks
  const total = blocks.reduce((a, b) => a + (b.minutes ?? 0), 0)
  const drillCount = blocks.reduce((a, b) => a + b.items.length, 0)
  const nameOf = (i: SummaryBlocks[number]['items'][number]) =>
    i.title || (i.drillId ? drills.data?.find((d) => d.id === i.drillId)?.name : null) || (i.drillId ? 'Övning' : 'Egen aktivitet')

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[460px] overflow-y-auto px-4">
        <DialogHeader><DialogTitle className="pr-6">{template?.name}</DialogTitle></DialogHeader>
        <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {total} min</span>
          <span>{blocks.length} block</span>
          <span>{drillCount} {drillCount === 1 ? 'övning' : 'övningar'}</span>
        </p>
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Mallen har inga block.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {blocks.map((b, n) => (
              <li key={n} className="rounded-lg border border-border">
                <div className="flex items-baseline justify-between gap-2 rounded-t-lg bg-muted px-3 py-1.5">
                  <span className="text-sm font-semibold">{b.name}</span>
                  {b.minutes ? <span className="shrink-0 text-xs text-muted-foreground">{b.minutes} min</span> : null}
                </div>
                {b.notes && <p className="px-3 pt-1.5 text-xs text-muted-foreground">{b.notes}</p>}
                {b.items.length > 0 ? (
                  <ul className="flex flex-col gap-1 px-3 py-2">
                    {b.items.map((i, m) => (
                      <li key={m} className="flex flex-wrap items-center gap-1.5 text-sm">
                        {i.groupName && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{i.groupName}</span>
                        )}
                        <span>{nameOf(i)}</span>
                        {i.level && (
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[i.level] ?? '#6b7280' }}>{i.level}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Inga övningar</p>
                )}
              </li>
            ))}
          </ol>
        )}
        {action && <div className="flex justify-end gap-2 pt-1">{action}</div>}
      </DialogContent>
    </Dialog>
  )
}
