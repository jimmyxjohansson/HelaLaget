'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react'
import { callBackend } from '../../hooks/backend/_core'
import { currentSquad } from '../../lib/squad-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import type { SlotEvent, SlotLeader, SlotPlayer } from '../../server/functions/planning/getPlanningSlot'
import { answerHex, formatCupDates, formatWhen, type Kind } from './shared'

type Slot = { event: SlotEvent; players: SlotPlayer[]; leaders: SlotLeader[] }

/** Grupper i bilden, i den här ordningen. Nekat och Ej svarat sist och nedtonat. */
const GROUPS: { label: string; statuses: string[]; dim?: boolean }[] = [
  { label: 'Kommer', statuses: ['Kommer'] },
  { label: 'Inbjudna', statuses: ['Inbjuden'] },
  { label: 'Förslag', statuses: ['Förslag'] },
  { label: 'Reserv', statuses: ['Reserv'] },
  { label: 'Nekat / ej svarat', statuses: ['Nekat', 'Ej svarat'], dim: true },
]

const COL_W = 250
const GAP = 16
const PAD = 20
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}

/** Ritar översikten: en kolumn per match/cup med vilka som är kallade. */
export function drawOverview(
  canvas: HTMLCanvasElement,
  slots: Slot[],
  opts: { kind: Kind; title: string; primary: string; accent: string; showDeclined: boolean },
) {
  const scale = 2
  const lineH = 20
  const n = Math.max(1, slots.length)
  const width = PAD * 2 + n * COL_W + (n - 1) * GAP

  // Höjd: rubrik + högsta kolumnen
  const colHeight = (s: Slot) => {
    let h = 74 + 12
    for (const g of GROUPS) {
      if (g.dim && !opts.showDeclined) continue
      const rows = s.players.filter((p) => g.statuses.includes(p.status ?? '')).length
      if (rows) h += 26 + rows * lineH + 6
    }
    if (s.leaders.length) h += 26 + lineH + 6
    return h + 8
  }
  const height = PAD + 44 + Math.max(...slots.map(colHeight), 120) + PAD

  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#111827'
  ctx.font = `700 18px ${FONT}`
  ctx.fillText(fit(ctx, opts.title, width - PAD * 2 - 140), PAD, PAD + 12)
  ctx.font = `400 12px ${FONT}`
  ctx.fillStyle = '#6b7280'
  const stamp = new Date().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Stockholm' })
  ctx.textAlign = 'right'
  ctx.fillText(stamp, width - PAD, PAD + 12)
  ctx.textAlign = 'left'

  slots.forEach((s, i) => {
    const x = PAD + i * (COL_W + GAP)
    let y = PAD + 44
    const h = colHeight(s)

    // Kolumnens ram
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x + 0.5, y + 0.5, COL_W - 1, h - 1, 10)
    ctx.stroke()

    // Rubrik i lagets färg
    ctx.fillStyle = opts.primary
    ctx.beginPath()
    ctx.roundRect(x, y, COL_W, 74, [10, 10, 0, 0])
    ctx.fill()
    ctx.fillStyle = opts.accent
    ctx.font = `700 15px ${FONT}`
    ctx.fillText(fit(ctx, `${i + 1}. ${s.event.title}`, COL_W - 24), x + 12, y + 20)
    ctx.font = `400 12px ${FONT}`
    const when = opts.kind === 'match' ? formatWhen(s.event.date) : formatCupDates(s.event.date, s.event.enddate)
    const meta = [s.event.difficulty, when, s.event.homeaway, s.event.matchplayers].filter(Boolean).join(' · ')
    ctx.fillText(fit(ctx, meta, COL_W - 24), x + 12, y + 40)
    const keepers = s.players.filter((p) => p.position === 'Målvakt').map((p) => p.shortname)
    ctx.fillText(fit(ctx, keepers.length ? `Målvakt: ${keepers.join(', ')}` : 'Ingen föreslagen målvakt', COL_W - 24), x + 12, y + 58)
    y += 74 + 12

    for (const g of GROUPS) {
      if (g.dim && !opts.showDeclined) continue
      const rows = s.players
        .filter((p) => g.statuses.includes(p.status ?? ''))
        .sort((a, b) => (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv'))
      if (!rows.length) continue
      ctx.font = `700 11px ${FONT}`
      ctx.fillStyle = g.dim ? '#9ca3af' : answerHex(g.statuses[0])
      ctx.fillText(`${g.label.toUpperCase()} (${rows.length})`, x + 12, y + 12)
      y += 26
      ctx.font = `400 14px ${FONT}`
      for (const p of rows) {
        ctx.fillStyle = answerHex(p.status)
        ctx.beginPath()
        ctx.arc(x + 17, y + lineH / 2 - 2, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = g.dim ? '#9ca3af' : '#111827'
        const name = `${p.shortname ?? ''}${p.position === 'Målvakt' ? ' (MV)' : ''}`
        ctx.fillText(fit(ctx, name, COL_W - 40), x + 28, y + lineH / 2 - 2)
        y += lineH
      }
      y += 6
    }

    if (s.leaders.length) {
      ctx.font = `700 11px ${FONT}`
      ctx.fillStyle = '#6b7280'
      ctx.fillText('LEDARE', x + 12, y + 12)
      y += 26
      ctx.font = `400 13px ${FONT}`
      ctx.fillStyle = '#111827'
      ctx.fillText(fit(ctx, s.leaders.map((l) => l.shortname).join(', '), COL_W - 24), x + 12, y + lineH / 2 - 2)
    }
  })
}

/**
 * Översikt av alla valda matcher/cuper sida vid sida som en bild, för att
 * skicka förslag till andra. Bilden kan kopieras, delas eller laddas ner.
 */
export default function OverviewDialog({
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [showDeclined, setShowDeclined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const key = eventIds.join(',')
  const squad = currentSquad()
  const title = `${squad ? `${squad.organizationName} ${squad.squadName}` : 'Hela Laget'} · ${kind === 'match' ? 'Matcher' : 'Cuper'}`

  useEffect(() => {
    if (!open) return
    setSlots(null)
    setPreview(null)
    setError(null)
    setDone(null)
    Promise.all(eventIds.map((id) => callBackend<Slot>('planning/getPlanningSlot', { kind, id, from: null })))
      .then(setSlots)
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, kind])

  useEffect(() => {
    if (!slots || !slots.length) return
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    drawOverview(canvas, slots, {
      kind,
      title,
      primary: squad?.primaryColor || '#24282E',
      accent: squad?.accentColor || '#FFFFFF',
      showDeclined,
    })
    setPreview(canvas.toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, showDeclined])

  const blob = () =>
    new Promise<Blob>((resolve, reject) =>
      canvasRef.current!.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunde inte skapa bilden.'))), 'image/png'),
    )

  const fileName = `kallelser-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })}.png`

  async function copy() {
    setError(null)
    try {
      // Promise direkt i ClipboardItem: krävs av Safari för att kopieringen ska räknas som ett knapptryck
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob() })])
      setDone('Bilden är kopierad. Klistra in den i ett meddelande.')
    } catch {
      setError('Webbläsaren tillåter inte att bilder kopieras. Använd Dela eller Ladda ner.')
    }
  }

  async function share() {
    setError(null)
    try {
      const file = new File([await blob()], fileName, { type: 'image/png' })
      await navigator.share({ files: [file], title })
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setError('Kunde inte dela bilden.')
    }
  }

  async function download() {
    const url = URL.createObjectURL(await blob())
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const canCopy = typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write
  const canShare =
    typeof navigator !== 'undefined' && !!navigator.canShare &&
    navigator.canShare({ files: [new File([], 'x.png', { type: 'image/png' })] })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[1100px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>Översikt att skicka</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          {canCopy && (
            <button type="button" onClick={copy} disabled={!preview}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Kopiera bild
            </button>
          )}
          {canShare && (
            <button type="button" onClick={share} disabled={!preview}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
              <Share2 className="h-4 w-4" /> Dela
            </button>
          )}
          <button type="button" onClick={download} disabled={!preview}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
            <Download className="h-4 w-4" /> Ladda ner
          </button>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={showDeclined} onChange={(e) => setShowDeclined(e.target.checked)} />
            Visa nekat / ej svarat
          </label>
        </div>
        {done && <p className="text-sm text-muted-foreground">{done}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {eventIds.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Välj {kind === 'match' ? 'matcher' : 'cuper'} i kolumnerna först.</p>
        ) : !preview ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Översikt över kallelserna" className="w-full rounded-lg border border-border" />
        )}
      </DialogContent>
    </Dialog>
  )
}
