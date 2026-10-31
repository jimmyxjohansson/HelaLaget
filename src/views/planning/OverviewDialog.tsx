'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react'
import { callBackend } from '../../hooks/backend/_core'
import { currentSquad } from '../../lib/squad-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import type { SlotEvent, SlotLeader, SlotPlayer } from '../../server/functions/planning/getPlanningSlot'
import { formatCupDates, formatWhen, percent, PERIODS, rankIndex, type Kind } from './shared'
import { RANK_COLOR } from '../../utils/rankColors'

type Slot = { event: SlotEvent; players: SlotPlayer[]; leaders: SlotLeader[] }

const COL_W = 260
const GAP = 16
const PAD = 20
const HEAD_H = 78
const LINE_H = 22
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}

/** Spelarna som visas: sorterade på rank och förnamn. Nekat/ej svarat bara om valt. */
export function overviewPlayers(s: Slot, showDeclined: boolean) {
  return s.players
    .filter((p) => showDeclined || (p.status !== 'Nekat' && p.status !== 'Ej svarat'))
    .sort((a, b) =>
      rankIndex(a.rank) - rankIndex(b.rank) ||
      (a.fullname ?? a.shortname ?? '').localeCompare(b.fullname ?? b.shortname ?? '', 'sv'))
}

/**
 * Laddar en bild för canvas. Först direkt (kräver CORS), annars via appens
 * bildproxy. Går den inte att ladda alls ritas ingen logga.
 */
export async function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null
  const tryLoad = (url: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    })
  const absolute = new URL(src, window.location.href)
  if (absolute.origin === window.location.origin) return tryLoad(absolute.href)
  return (await tryLoad(absolute.href)) ?? tryLoad(`/api/bild?url=${encodeURIComponent(absolute.href)}`)
}

/** Ritar översikten: en kolumn per match/cup med kallade spelare, rank och närvaro. */
export function drawOverview(
  canvas: HTMLCanvasElement,
  slots: Slot[],
  logos: (HTMLImageElement | null)[],
  opts: { kind: Kind; title: string; primary: string; accent: string; showDeclined: boolean; periodLabel: string },
) {
  const scale = 2
  const n = Math.max(1, slots.length)
  const width = PAD * 2 + n * COL_W + (n - 1) * GAP
  const lists = slots.map((s) => overviewPlayers(s, opts.showDeclined))
  const colHeight = (i: number) =>
    HEAD_H + 12 + Math.max(1, lists[i].length) * LINE_H + (slots[i].leaders.length ? 34 + LINE_H : 0) + 12
  const height = PAD + 44 + Math.max(...slots.map((_, i) => colHeight(i)), 120) + PAD

  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#111827'
  ctx.font = `700 18px ${FONT}`
  ctx.fillText(fit(ctx, opts.title, width - PAD * 2 - 150), PAD, PAD + 12)
  ctx.font = `400 12px ${FONT}`
  ctx.fillStyle = '#6b7280'
  const stamp = new Date().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Stockholm' })
  ctx.textAlign = 'right'
  const period = opts.periodLabel === 'Alla' ? 'all tid' : `senaste ${opts.periodLabel.replace('mån', 'månader').replace('1 månader', '1 månad')}`
  ctx.fillText(`Träningsnärvaro ${period} · ${stamp}`, width - PAD, PAD + 12)
  ctx.textAlign = 'left'

  slots.forEach((s, i) => {
    const x = PAD + i * (COL_W + GAP)
    let y = PAD + 44
    const h = colHeight(i)

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x + 0.5, y + 0.5, COL_W - 1, h - 1, 10)
    ctx.stroke()

    // Rubrik i lagets färg, med motståndarens logga
    ctx.fillStyle = opts.primary
    ctx.beginPath()
    ctx.roundRect(x, y, COL_W, HEAD_H, [10, 10, 0, 0])
    ctx.fill()
    let tx = x + 12
    const logo = logos[i]
    if (opts.kind === 'match') {
      const cx = x + 12 + 22
      const cy = y + HEAD_H / 2
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(cx, cy, 22, 0, Math.PI * 2)
      ctx.fill()
      if (logo) {
        const r = Math.min(34 / logo.width, 34 / logo.height)
        const w = logo.width * r
        const lh = logo.height * r
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, 21, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(logo, cx - w / 2, cy - lh / 2, w, lh)
        ctx.restore()
      } else {
        ctx.fillStyle = '#6b7280'
        ctx.font = `700 18px ${FONT}`
        ctx.textAlign = 'center'
        ctx.fillText((s.event.title[0] ?? '?').toUpperCase(), cx, cy + 1)
        ctx.textAlign = 'left'
      }
      tx = x + 12 + 44 + 10
    }
    const tw = x + COL_W - 12 - tx
    ctx.fillStyle = opts.accent
    ctx.font = `700 15px ${FONT}`
    ctx.fillText(fit(ctx, `${i + 1}. ${s.event.title}`, tw), tx, y + 20)
    ctx.font = `400 12px ${FONT}`
    const when = opts.kind === 'match' ? formatWhen(s.event.date) : formatCupDates(s.event.date, s.event.enddate)
    ctx.fillText(fit(ctx, [s.event.difficulty, when].filter(Boolean).join(' · '), tw), tx, y + 40)
    ctx.fillText(fit(ctx, [s.event.homeaway, s.event.matchplayers, `${lists[i].length} spelare`].filter(Boolean).join(' · '), tw), tx, y + 58)
    y += HEAD_H

    const rankX = x + COL_W - 112
    const pctRight = x + COL_W - 12
    y += 12

    ctx.font = `400 14px ${FONT}`
    if (lists[i].length === 0) {
      ctx.fillStyle = '#9ca3af'
      ctx.fillText('Ingen kallad ännu', x + 12, y + LINE_H / 2 - 2)
      y += LINE_H
    }
    for (const p of lists[i]) {
      const cy = y + LINE_H / 2 - 2
      const dim = p.status === 'Nekat' || p.status === 'Ej svarat'
      ctx.font = `400 14px ${FONT}`
      ctx.fillStyle = dim ? '#9ca3af' : '#111827'
      const name = `${p.shortname ?? ''}${p.position === 'Målvakt' ? ' (MV)' : ''}`
      ctx.fillText(fit(ctx, name, rankX - x - 18), x + 12, cy)
      if (p.rank) {
        ctx.font = `700 11px ${FONT}`
        const bw = ctx.measureText(p.rank).width + 10
        ctx.fillStyle = RANK_COLOR[p.rank.toUpperCase()] ?? '#B7B7B7'
        ctx.beginPath()
        ctx.roundRect(rankX, cy - 8, bw, 16, 3)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(p.rank, rankX + 5, cy + 1)
      }
      const pct = percent(p.coming, p.total)
      ctx.font = `400 13px ${FONT}`
      ctx.fillStyle = pct == null ? '#9ca3af' : pct >= 75 ? '#15803d' : pct >= 50 ? '#d97706' : '#dc2626'
      ctx.textAlign = 'right'
      ctx.fillText(pct == null ? '–' : `${pct}%`, pctRight, cy)
      ctx.textAlign = 'left'
      y += LINE_H
    }

    if (s.leaders.length) {
      y += 12
      ctx.font = `700 10px ${FONT}`
      ctx.fillStyle = '#6b7280'
      ctx.fillText('LEDARE', x + 12, y + 9)
      y += 22
      ctx.font = `400 13px ${FONT}`
      ctx.fillStyle = '#111827'
      ctx.fillText(fit(ctx, s.leaders.map((l) => l.shortname).join(', '), COL_W - 24), x + 12, y + LINE_H / 2 - 2)
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
  from,
  months,
  onClose,
}: {
  kind: Kind
  eventIds: number[]
  open: boolean
  /** Närvaroperiod, samma som på planeringssidan */
  from: string | null
  months: number
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [logos, setLogos] = useState<(HTMLImageElement | null)[]>([])
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
    Promise.all(eventIds.map((id) => callBackend<Slot>('planning/getPlanningSlot', { kind, id, from })))
      .then(async (loaded) => {
        setLogos(kind === 'match' ? await Promise.all(loaded.map((s) => loadImage(s.event.imgurl))) : [])
        setSlots(loaded)
      })
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, kind, from])

  useEffect(() => {
    if (!slots || !slots.length) return
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    drawOverview(canvas, slots, logos, {
      kind,
      title,
      primary: squad?.primaryColor || '#24282E',
      accent: squad?.accentColor || '#FFFFFF',
      showDeclined,
      periodLabel: PERIODS.find((p) => p.months === months)?.label ?? '',
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
