'use client'

import { useMemo, useState } from 'react'
import { Info, Search, SlidersHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { cn } from '../../lib/shadcn/utils'
import { DrillCard, DrillFilters, filterDrills, useDrillFilters, type DrillListItem } from '../drills/DrillBank'
import DrillPreview from '../drills/DrillPreview'

/** Välj en övning ur banken, med samma filter som övningsbanken. */
export default function DrillPicker({ open, drills, onClose, onPick }: {
  open: boolean
  drills: DrillListItem[] | undefined
  onClose: () => void
  onPick: (d: DrillListItem) => void
}) {
  const f = useDrillFilters('hl-plan-drills')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const list = drills ?? []
  const shown = useMemo(() => filterDrills(list, f), [list, f])
  const [preview, setPreview] = useState<DrillListItem | null>(null)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-3 overflow-hidden p-4">
        <DialogHeader>
          <DialogTitle>Välj övning</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Sök övning" autoFocus
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="button" onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn('flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm md:hidden', filtersOpen && 'bg-muted')}>
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>
        <DrillFilters f={f} list={list} open={filtersOpen} />
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {!drills ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Hämtar övningar…</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Övningsbanken är tom. Lägg till övningar under Mer → Övningsbank.</p>
          ) : shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Inga övningar matchar filtret.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((d) => (
                <div key={d.id} className="relative">
                  <DrillCard d={d} compact onClick={() => onPick(d)} />
                  <button
                    type="button"
                    onClick={() => setPreview(d)}
                    aria-label={`Visa hela övningen ${d.name}`}
                    title="Visa hela övningen"
                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border hover:bg-background"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DrillPreview
          drillId={preview?.id ?? null}
          onClose={() => setPreview(null)}
          onPick={() => { if (preview) { const d = preview; setPreview(null); onPick(d) } }}
        />
      </DialogContent>
    </Dialog>
  )
}
