'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { ShareImageBar } from '../planning/OverviewDialog'
import { currentSquad } from '../../lib/squad-store'
import { drawPlan, type PlanImageData } from './planImage'

const STORE = 'hl-plan-image'

/** Träningsplanen som en bild att kopiera, dela eller ladda ner. */
export default function PlanImageDialog({ open, onClose, data, fileName }: {
  open: boolean
  onClose: () => void
  data: Omit<PlanImageData, 'primary' | 'accent'>
  fileName: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [opts, setOpts] = useState({ diagrams: true, coaching: true })
  // svg-elementen kan inte göras om till JSON; de följer övningarna
  const key = JSON.stringify(data, (k, v) => (k === 'svg' ? !!v : v))

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) ?? 'null')
      if (v) setOpts({ diagrams: v.diagrams !== false, coaching: v.coaching !== false })
    } catch { /* ingen lagring */ }
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPreview(null)
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    const squad = currentSquad()
    drawPlan(canvas, { ...data, primary: squad?.primaryColor || '#24282E', accent: squad?.accentColor || '#FFFFFF' }, opts)
      .then(() => { if (!cancelled) setPreview(canvas.toDataURL('image/png')) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, opts.diagrams, opts.coaching])

  function set(patch: Partial<typeof opts>) {
    const next = { ...opts, ...patch }
    setOpts(next)
    try { localStorage.setItem(STORE, JSON.stringify(next)) } catch { /* ingen lagring */ }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[760px] overflow-y-auto px-4">
        <DialogHeader><DialogTitle>Bild av träningsplanen</DialogTitle></DialogHeader>
        <ShareImageBar canvas={canvasRef} ready={!!preview} fileName={fileName} title={`Träningsplan ${data.title}`}>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={opts.diagrams} onChange={(e) => set({ diagrams: e.target.checked })} /> Ritningar
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={opts.coaching} onChange={(e) => set({ coaching: e.target.checked })} /> Coachningspunkter
          </label>
        </ShareImageBar>
        {!preview ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Träningsplanen som bild" className="w-full rounded-lg border border-border" />
        )}
      </DialogContent>
    </Dialog>
  )
}
