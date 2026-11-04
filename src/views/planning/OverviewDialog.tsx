'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react'
import { callBackend } from '../../hooks/backend/_core'
import { currentSquad } from '../../lib/squad-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import type { SlotEvent, SlotLeader, SlotPlayer } from '../../server/functions/planning/getPlanningSlot'
import { formatCupDates, formatWhen, percent, PERIODS, rankIndex, type Kind } from './shared'
import { RANK_COLOR } from '../../utils/rankColors'

type Slot = { event: SlotEvent; players: SlotPlayer[]; leaders: SlotLeader[] }

const COL_W = 200
const GAP = 10
const PAD = 12
const HEAD_H = 56
const LINE_H = 17
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
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

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const SIZE_COLS = 2

/** Tröjstorlekar bland spelarna som är med (inte nekat/ej svarat), sorterade. */
export function shirtSummary(players: SlotPlayer[]) {
  const counts = new Map<string, number>()
  let missing = 0
  for (const p of players) {
    if (p.status === 'Nekat' || p.status === 'Ej svarat') continue
    const size = p.shirtSize?.trim()
    if (size) counts.set(size, (counts.get(size) ?? 0) + 1)
    else missing++
  }
  const rank = (v: string) => {
    const n = parseFloat(v)
    if (!Number.isNaN(n)) return [0, n] as const
    const i = SIZE_ORDER.indexOf(v.toUpperCase())
    return [i === -1 ? 2 : 1, i] as const
  }
  const rows = [...counts.entries()].sort(([a], [b]) => {
    const [ga, va] = rank(a)
    const [gb, vb] = rank(b)
    return ga - gb || va - vb || a.localeCompare(b, 'sv')
  }).map(([size, n]) => ({ size, n }))
  if (missing) rows.push({ size: 'Saknas', n: missing })
  return rows
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
  opts: { kind: Kind; title: string; primary: string; accent: string; showDeclined: boolean; showShirts: boolean; periodLabel: string },
) {
  const scale = 2
  const n = Math.max(1, slots.length)
  const width = PAD * 2 + n * COL_W + (n - 1) * GAP
  const lists = slots.map((s) => overviewPlayers(s, opts.showDeclined))
  const shirts = slots.map((s) => (opts.showShirts ? shirtSummary(s.players) : []))
  const colHeight = (i: number) =>
    HEAD_H + 8 + Math.max(1, lists[i].length) * LINE_H + (slots[i].leaders.length ? 26 + LINE_H : 0) +
    (shirts[i].length ? 26 + Math.ceil(shirts[i].length / SIZE_COLS) * LINE_H : 0) + 8
  const height = PAD + Math.max(...slots.map((_, i) => colHeight(i)), 80) + PAD

  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)


  slots.forEach((s, i) => {
    const x = PAD + i * (COL_W + GAP)
    let y = PAD
    const h = colHeight(i)

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x + 0.5, y + 0.5, COL_W - 1, h - 1, 8)
    ctx.stroke()

    // Rubrik i lagets färg, med motståndarens logga
    ctx.fillStyle = opts.primary
    ctx.beginPath()
    ctx.roundRect(x, y, COL_W, HEAD_H, [8, 8, 0, 0])
    ctx.fill()
    let tx = x + 9
    const logo = logos[i]
    if (opts.kind === 'match') {
      const cx = x + 9 + 16
      const cy = y + HEAD_H / 2
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(cx, cy, 16, 0, Math.PI * 2)
      ctx.fill()
      if (logo) {
        const r = Math.min(24 / logo.width, 24 / logo.height)
        const w = logo.width * r
        const lh = logo.height * r
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, 15, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(logo, cx - w / 2, cy - lh / 2, w, lh)
        ctx.restore()
      } else {
        ctx.fillStyle = '#6b7280'
        ctx.font = `700 13px ${FONT}`
        ctx.textAlign = 'center'
        ctx.fillText((s.event.title[0] ?? '?').toUpperCase(), cx, cy + 1)
        ctx.textAlign = 'left'
      }
      tx = x + 9 + 32 + 8
    }
    const tw = x + COL_W - 9 - tx
    ctx.fillStyle = opts.accent
    ctx.font = `700 12px ${FONT}`
    ctx.fillText(fit(ctx, `${i + 1}. ${s.event.title}`, tw), tx, y + 14)
    ctx.font = `400 10px ${FONT}`
    const when = opts.kind === 'match' ? formatWhen(s.event.date) : formatCupDates(s.event.date, s.event.enddate)
    ctx.fillText(fit(ctx, [s.event.difficulty, when].filter(Boolean).join(' · '), tw), tx, y + 29)
    ctx.fillText(fit(ctx, [s.event.homeaway, s.event.matchplayers, `${lists[i].length} spelare`].filter(Boolean).join(' · '), tw), tx, y + 43)
    y += HEAD_H

    const rankX = x + COL_W - 70
    const pctRight = x + COL_W - 9
    y += 8

    ctx.font = `400 12px ${FONT}`
    if (lists[i].length === 0) {
      ctx.fillStyle = '#9ca3af'
      ctx.fillText('Ingen kallad ännu', x + 9, y + LINE_H / 2 - 2)
      y += LINE_H
    }
    for (const p of lists[i]) {
      const cy = y + LINE_H / 2 - 2
      const dim = p.status === 'Nekat' || p.status === 'Ej svarat'
      ctx.font = `400 12px ${FONT}`
      ctx.fillStyle = dim ? '#9ca3af' : '#111827'
      const name = `${p.shortname ?? ''}${p.position === 'Målvakt' ? ' (MV)' : ''}`
      ctx.fillText(fit(ctx, name, rankX - x - 14), x + 9, cy)
      if (p.rank) {
        ctx.font = `700 9px ${FONT}`
        const bw = ctx.measureText(p.rank).width + 8
        ctx.fillStyle = RANK_COLOR[p.rank.toUpperCase()] ?? '#B7B7B7'
        ctx.beginPath()
        ctx.roundRect(rankX, cy - 6.5, bw, 13, 3)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(p.rank, rankX + 4, cy + 1)
      }
      const pct = percent(p.coming, p.total)
      ctx.font = `400 11px ${FONT}`
      ctx.fillStyle = pct == null ? '#9ca3af' : pct >= 75 ? '#15803d' : pct >= 50 ? '#d97706' : '#dc2626'
      ctx.textAlign = 'right'
      ctx.fillText(pct == null ? '–' : `${pct}%`, pctRight, cy)
      ctx.textAlign = 'left'
      y += LINE_H
    }

    if (s.leaders.length) {
      y += 10
      ctx.font = `700 9px ${FONT}`
      ctx.fillStyle = '#6b7280'
      ctx.fillText('LEDARE', x + 9, y + 8)
      y += 16
      ctx.font = `400 11px ${FONT}`
      ctx.fillStyle = '#111827'
      ctx.fillText(fit(ctx, s.leaders.map((l) => l.shortname).join(', '), COL_W - 18), x + 9, y + LINE_H / 2 - 2)
      y += LINE_H
    }

    if (shirts[i].length) {
      y += 10
      ctx.font = `700 9px ${FONT}`
      ctx.fillStyle = '#6b7280'
      ctx.fillText('TRÖJSTORLEKAR', x + 9, y + 8)
      y += 16
      const cellW = (COL_W - 18) / SIZE_COLS
      shirts[i].forEach((r, j) => {
        const cx = x + 9 + (j % SIZE_COLS) * cellW
        const cy = y + Math.floor(j / SIZE_COLS) * LINE_H + LINE_H / 2 - 2
        const count = `${r.n} st`
        ctx.font = `400 11px ${FONT}`
        const cw = ctx.measureText(count).width
        ctx.fillStyle = r.size === 'Saknas' ? '#9ca3af' : '#111827'
        ctx.font = `700 11px ${FONT}`
        ctx.fillText(fit(ctx, r.size, cellW - cw - 22), cx, cy)
        ctx.font = `400 11px ${FONT}`
        ctx.fillStyle = '#6b7280'
        ctx.textAlign = 'right'
        ctx.fillText(count, cx + cellW - (j % SIZE_COLS === SIZE_COLS - 1 ? 0 : 14), cy)
        ctx.textAlign = 'left'
      })
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
  const [showShirts, setShowShirts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = eventIds.join(',')
  const squad = currentSquad()
  const title = `${squad ? `${squad.organizationName} ${squad.squadName}` : 'Hela Laget'} · ${kind === 'match' ? 'Matcher' : 'Cuper'}`

  useEffect(() => {
    if (!open) return
    setSlots(null)
    setPreview(null)
    setError(null)
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
      showShirts,
      periodLabel: PERIODS.find((p) => p.months === months)?.label ?? '',
    })
    setPreview(canvas.toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, showDeclined, showShirts])

  const fileName = `kallelser-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })}.png`

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[1100px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>Översikt att skicka</DialogTitle>
        </DialogHeader>
        <ShareImageBar canvas={canvasRef} ready={!!preview} fileName={fileName} title={title}>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={showDeclined} onChange={(e) => setShowDeclined(e.target.checked)} />
            Visa nekat / ej svarat
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={showShirts} onChange={(e) => setShowShirts(e.target.checked)} />
            Visa tröjstorlekar
          </label>
        </ShareImageBar>
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

/** Knapparna Kopiera bild, Dela och Ladda ner för en bild ritad på en canvas. */
export function ShareImageBar({ canvas, ready, fileName, title, children }: {
  canvas: RefObject<HTMLCanvasElement | null>
  ready: boolean
  fileName: string
  title: string
  /** Val som visas till höger, t.ex. kryssrutor */
  children?: ReactNode
}) {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const blob = () =>
    new Promise<Blob>((resolve, reject) => {
      if (!canvas.current) return reject(new Error('Bilden är inte klar.'))
      canvas.current.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunde inte skapa bilden.'))), 'image/png')
    })

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
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canCopy && (
          <button type="button" onClick={copy} disabled={!ready}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Kopiera bild
          </button>
        )}
        {canShare && (
          <button type="button" onClick={share} disabled={!ready}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
            <Share2 className="h-4 w-4" /> Dela
          </button>
        )}
        <button type="button" onClick={download} disabled={!ready}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
          <Download className="h-4 w-4" /> Ladda ner
        </button>
        {children && <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">{children}</div>}
      </div>
      {done && <p className="text-sm text-muted-foreground">{done}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  )
}
