'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { ShareImageBar } from '../planning/OverviewDialog'
import { currentSquad } from '../../lib/squad-store'
import { drawLevel, type LevelImageData } from './levelImage'

const STORE = 'hl-level-image'

/** Nivåbedömningen som en bild att kopiera, dela eller ladda ner. */
export default function LevelImageDialog({ open, onClose, data }: {
  open: boolean
  onClose: () => void
  data: Omit<LevelImageData, 'primary' | 'accent'>
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [opts, setOpts] = useState({ descriptions: true, mentalSocial: true })
  const key = JSON.stringify({ ...data, matrix: data.matrix.key })

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) ?? 'null')
      if (v) setOpts({ descriptions: v.descriptions !== false, mentalSocial: v.mentalSocial !== false })
    } catch { /* ingen lagring */ }
  }, [])

  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    const squad = currentSquad()
    drawLevel(canvas, { ...data, primary: squad?.primaryColor || '#24282E', accent: squad?.accentColor || '#FFFFFF' }, opts)
    setPreview(canvas.toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, opts.descriptions, opts.mentalSocial])

  function set(patch: Partial<typeof opts>) {
    const next = { ...opts, ...patch }
    setOpts(next)
    try { localStorage.setItem(STORE, JSON.stringify(next)) } catch { /* ingen lagring */ }
  }

  const fileName = `niva-${data.player.toLowerCase().replace(/[^a-z0-9åäö]+/g, '-').replace(/^-|-$/g, '')}.png`

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[680px] overflow-y-auto px-4">
        <DialogHeader><DialogTitle>Bild av bedömningen</DialogTitle></DialogHeader>
        <ShareImageBar canvas={canvasRef} ready={!!preview} fileName={fileName} title={`Nivåbedömning ${data.player}`}>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={opts.descriptions} onChange={(e) => set({ descriptions: e.target.checked })} /> Beskrivningar
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={opts.mentalSocial} onChange={(e) => set({ mentalSocial: e.target.checked })} /> Mentalt och socialt
          </label>
        </ShareImageBar>
        {!preview ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`Nivåbedömning för ${data.player}`} className="w-full rounded-lg border border-border" />
        )}
        <p className="text-xs text-muted-foreground">Bilden innehåller uppgifter om ett barn. Dela den bara inom ledargruppen.</p>
      </DialogContent>
    </Dialog>
  )
}
