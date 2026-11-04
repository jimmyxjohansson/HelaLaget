import { FONT, fit } from './OverviewDialog'
import { percent, rankIndex } from './shared'
import { RANK_COLOR } from '../../utils/rankColors'

export type TotalRow = {
  id: number
  shortname: string | null
  rank: string | null
  gender: string | null
  status: string | null
  canGoalkeeper: boolean
  lastmatch: number | null
  matches: number
  coming: number
  total: number
}

const W = 380
const PAD = 12
const HEAD_H = 62
const LINE_H = 18

/** Spelarna i bilden: rank först, sedan namn. */
export function totalRows(rows: TotalRow[]) {
  return [...rows].sort((a, b) =>
    rankIndex(a.rank) - rankIndex(b.rank) || (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv'))
}

/**
 * Ritar Totalt som en bild: spelarna som inte är kallade till någon av de valda
 * matcherna eller cuperna, med rank, dagar sedan senaste match, matcher och närvaro.
 */
export function drawTotal(
  canvas: HTMLCanvasElement,
  rows: TotalRow[],
  opts: { heading: string; events: string[]; periodLabel: string; primary: string; accent: string; mixed: boolean },
) {
  const list = totalRows(rows)
  const scale = 2
  const tableTop = PAD + HEAD_H + 8
  const height = tableTop + LINE_H + Math.max(1, list.length) * LINE_H + PAD + 4

  canvas.width = W * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, height)

  const x = PAD
  const w = W - PAD * 2
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x + 0.5, PAD + 0.5, w - 1, height - PAD * 2 - 1, 8)
  ctx.stroke()

  // Rubrik i lagets färg
  ctx.fillStyle = opts.primary
  ctx.beginPath()
  ctx.roundRect(x, PAD, w, HEAD_H, [8, 8, 0, 0])
  ctx.fill()
  ctx.fillStyle = opts.accent
  ctx.font = `700 13px ${FONT}`
  ctx.fillText(fit(ctx, opts.heading, w - 18), x + 9, PAD + 15)
  ctx.font = `400 10px ${FONT}`
  ctx.fillText(fit(ctx, opts.events.length ? opts.events.join(' · ') : '', w - 18), x + 9, PAD + 32)
  ctx.fillText(fit(ctx, `Närvaro på träning: ${opts.periodLabel}`, w - 18), x + 9, PAD + 47)

  const rankX = x + w - 150
  const lastRight = x + w - 88
  const mRight = x + w - 50
  const pctRight = x + w - 9
  let y = tableTop

  ctx.font = `700 9px ${FONT}`
  ctx.fillStyle = '#6b7280'
  ctx.fillText('NAMN', x + 9, y + 6)
  ctx.fillText('RANK', rankX, y + 6)
  ctx.textAlign = 'right'
  ctx.fillText('SEN.', lastRight, y + 6)
  ctx.fillText('M', mRight, y + 6)
  ctx.fillText('%', pctRight, y + 6)
  ctx.textAlign = 'left'
  y += LINE_H

  if (list.length === 0) {
    ctx.font = `400 12px ${FONT}`
    ctx.fillStyle = '#9ca3af'
    ctx.fillText('Alla är kallade', x + 9, y + LINE_H / 2 - 2)
  }
  list.forEach((p, i) => {
    const cy = y + LINE_H / 2 - 2
    if (i % 2 === 1) {
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(x + 1, y - 3, w - 2, LINE_H)
    }
    ctx.font = `400 12px ${FONT}`
    ctx.fillStyle = '#111827'
    const extra = [
      p.canGoalkeeper ? 'MV' : null,
      opts.mixed && p.gender ? (p.gender === 'Flicka' ? 'F' : 'P') : null,
      p.status && p.status !== 'Aktiv' ? p.status : null,
    ].filter(Boolean)
    const name = fit(ctx, p.shortname ?? '', rankX - x - 18)
    ctx.fillText(name, x + 9, cy)
    if (extra.length) {
      const nw = ctx.measureText(name).width
      ctx.font = `400 10px ${FONT}`
      ctx.fillStyle = '#6b7280'
      ctx.fillText(fit(ctx, `(${extra.join(', ')})`, rankX - x - 22 - nw), x + 13 + nw, cy)
    }
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
    ctx.font = `400 11px ${FONT}`
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'right'
    ctx.fillText(p.lastmatch != null ? `${p.lastmatch}d` : '–', lastRight, cy)
    ctx.fillText(String(p.matches), mRight, cy)
    const pct = percent(p.coming, p.total)
    ctx.fillStyle = pct == null ? '#9ca3af' : pct >= 75 ? '#15803d' : pct >= 50 ? '#d97706' : '#dc2626'
    ctx.fillText(pct == null ? '–' : `${pct}%`, pctRight, cy)
    ctx.textAlign = 'left'
    y += LINE_H
  })
}
