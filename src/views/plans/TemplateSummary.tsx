'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { useGetDrills } from '../../hooks/backend/drills'
import { currentSquad } from '../../lib/squad-store'
import DrillDiagram from '../../components/drills/DrillDiagram'
import { isDiagram, type Diagram } from '../../utils/diagram'
import { LEVEL_COLOR } from '../../utils/drills'
import { ShareImageBar } from '../planning/OverviewDialog'
import { drawPlan } from './planImage'
import { blocksFromTemplate, type TemplateBlocks } from './TrainingPlan'

export type SummaryTemplate = { name: string; blocks: unknown }

const STORE = 'hl-plan-image'

/** "i"-knapp som öppnar en sammanfattning av mallen. */
export function TemplateInfoButton({ onClick, name }: { onClick: () => void; name: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Visa sammanfattning av ${name}`} title="Visa sammanfattning"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
      <Info className="h-4 w-4" />
    </button>
  )
}

/**
 * Sammanfattning av en träningsplansmall, ritad som samma bild som träningsplanen
 * (block, tid, övningar med ritningar, nivåer och coachningspunkter). Går att dela och spara.
 */
export default function TemplateSummary({ template, onClose, action }: {
  template: SummaryTemplate | null
  onClose: () => void
  /** T.ex. en Använd-knapp längst ner */
  action?: React.ReactNode
}) {
  const drills = useGetDrills()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hidden = useRef<HTMLDivElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [opts, setOpts] = useState({ diagrams: true, coaching: true })

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) ?? 'null')
      if (v) setOpts({ diagrams: v.diagrams !== false, coaching: v.coaching !== false })
    } catch { /* ingen lagring */ }
  }, [])

  useEffect(() => {
    if (template && !drills.data && !drills.loading) drills.trigger().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  // Samma block som träningsplanen visar, med övningarna från banken
  const blocks = useMemo(
    () => (template && drills.data ? blocksFromTemplate(template.blocks as TemplateBlocks, drills.data) : null),
    [template, drills.data],
  )
  const total = (blocks ?? []).reduce((a, b) => a + (Number(b.minutes) || 0), 0)
  const drillCount = (blocks ?? []).reduce((a, b) => a + b.items.length, 0)

  // Ritningen som visas: nivåns egen om den har en, annars övningens
  const diagramOf = (i: NonNullable<typeof blocks>[number]['items'][number]): Diagram | null => {
    const d = i.drill
    if (!d) return null
    const lv = i.level ? d.levels?.[i.level as keyof typeof d.levels] : null
    return isDiagram(lv?.diagram) ? lv.diagram : isDiagram(d.diagram) ? d.diagram : null
  }

  useEffect(() => {
    if (!template || !blocks) { setPreview(null); return }
    let cancelled = false
    setPreview(null)
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    const squad = currentSquad()
    // Vänta en bildruta så att de dolda ritningarna finns på sidan
    const raf = requestAnimationFrame(() => {
      const svgOf = (key: string) => hidden.current?.querySelector<SVGSVGElement>(`[data-sum-item="${key}"] svg`) ?? null
      drawPlan(canvas, {
        title: template.name,
        subtitle: `Träningsplansmall · ${total} min · ${blocks.length} block · ${drillCount} ${drillCount === 1 ? 'övning' : 'övningar'}`,
        roaming: '',
        primary: squad?.primaryColor || '#24282E',
        accent: squad?.accentColor || '#FFFFFF',
        blocks: blocks.map((b) => ({
          start: null,
          name: b.name,
          minutes: Number(b.minutes) || 0,
          notes: b.notes || null,
          items: b.items.map((i) => {
            const d = i.drill
            const lv = d && i.level ? d.levels?.[i.level as keyof typeof d.levels] : null
            return {
              group: i.groupName,
              name: d?.name ?? (i.title || 'Egen aktivitet'),
              level: i.level,
              levelColor: i.level ? LEVEL_COLOR[i.level] ?? null : null,
              holders: '',
              levelText: lv?.text ?? null,
              coaching: (d?.coaching ?? '').split('\n').map((c) => c.trim()).filter(Boolean),
              notes: i.notes || null,
              svg: svgOf(i.key),
            }
          }),
        })),
      }, opts).then(() => { if (!cancelled) setPreview(canvas.toDataURL('image/png')) })
    })
    return () => { cancelled = true; cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, opts.diagrams, opts.coaching])

  function set(patch: Partial<typeof opts>) {
    const next = { ...opts, ...patch }
    setOpts(next)
    try { localStorage.setItem(STORE, JSON.stringify(next)) } catch { /* ingen lagring */ }
  }

  const fileName = `mall-${(template?.name ?? 'traningsplan').toLowerCase().replace(/[^a-z0-9åäö]+/g, '-').replace(/^-|-$/g, '')}.png`

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[760px] overflow-y-auto px-4">
        <DialogHeader><DialogTitle className="pr-6">{template?.name}</DialogTitle></DialogHeader>
        <ShareImageBar canvas={canvasRef} ready={!!preview} fileName={fileName} title={`Träningsplansmall ${template?.name ?? ''}`}>
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
          <img src={preview} alt={`Sammanfattning av ${template?.name ?? 'mallen'}`} className="w-full rounded-lg border border-border" />
        )}
        {action && <div className="flex justify-end gap-2 pt-1">{action}</div>}
        {/* Ritningarna ritas här utanför skärmen och kopieras in i bilden */}
        <div ref={hidden} aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[300px]">
          {(blocks ?? []).flatMap((b) => b.items).map((i) => {
            const dia = diagramOf(i)
            return dia ? <div key={i.key} data-sum-item={i.key}><DrillDiagram diagram={dia} className="w-full" /></div> : null
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
