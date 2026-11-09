'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { useGetSquadInfos } from '../../hooks/backend/infos'
import RichText from './RichText'

/**
 * Knapp som visar lagets information för träningar eller matcher (t.ex. koder
 * till förråd och bolltunna). Syns bara när det finns något att visa.
 */
export default function InfoButton({ context, className, indooroutdoor, homeaway }: {
  context: 'training' | 'match'
  className: string
  indooroutdoor?: string | null
  homeaway?: string | null
}) {
  const infos = useGetSquadInfos()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    infos.trigger({ context, indooroutdoor: indooroutdoor ?? null, homeaway: homeaway ?? null }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, indooroutdoor, homeaway])

  const list = infos.data ?? []
  if (!list.length) return null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label="Information" title="Information">
        <Info className="w-5 h-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[480px] overflow-y-auto px-4">
          <DialogHeader><DialogTitle>Information</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            {list.map((i) => (
              <section key={i.id} className="rounded-lg border border-border bg-card px-3 py-2.5">
                <h3 className="mb-1 font-semibold">{i.title}</h3>
                {i.body.trim() ? <RichText text={i.body} /> : <p className="text-sm text-muted-foreground">–</p>}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
