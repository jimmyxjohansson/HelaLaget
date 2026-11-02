'use client'

import { RANK_COLOR } from '../../utils/rankColors'
import { fitText } from '../../utils/shareImage'

export type ImageGroup = {
  label: string
  players: { name: string; rank: string | null; goalkeeper?: boolean }[]
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const COL_W = 190
const COL_GAP = 24
const PAD = 16
const TITLE_H = 44
const GROUP_HEAD = 24
const LINE_H = 22
const ROW_GAP = 14
const COLS = 2
const BADGE_X = 112

/**
 * Ritar träningsgrupperna som en kompakt bild att skicka, likt
 * gruppöversikten i appen: två kolumner med grupp, antal, namn och rank.
 */
export function drawGroups(
  canvas: HTMLCanvasElement,
  groups: ImageGroup[],
  opts: { title: string; subtitle: string; primary: string; accent: string },
) {
  const scale = 2
  const cols = Math.min(COLS, Math.max(1, groups.length))
  const rows: ImageGroup[][] = []
  for (let i = 0; i < groups.length; i += cols) rows.push(groups.slice(i, i + cols))
  const groupHeight = (g: ImageGroup) => GROUP_HEAD + Math.max(1, g.players.length) * LINE_H
  const rowHeights = rows.map((r) => Math.max(...r.map(groupHeight)))
  const width = PAD * 2 + cols * COL_W + (cols - 1) * COL_GAP
  const height = PAD + TITLE_H + rowHeights.reduce((a, h) => a + h, 0) + Math.max(0, rows.length - 1) * ROW_GAP + PAD

  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Rubrik: lagets färg som en tunn rand, titel och datum
  ctx.fillStyle = opts.primary
  ctx.fillRect(0, 0, width, 4)
  ctx.fillStyle = '#111827'
  ctx.font = `700 15px ${FONT}`
  ctx.fillText(fitText(ctx, opts.title, width - PAD * 2), PAD, PAD + 8)
  ctx.fillStyle = '#6b7280'
  ctx.font = `400 11px ${FONT}`
  ctx.fillText(fitText(ctx, opts.subtitle, width - PAD * 2), PAD, PAD + 26)

  let y = PAD + TITLE_H
  rows.forEach((row, ri) => {
    row.forEach((g, ci) => {
      const x = PAD + ci * (COL_W + COL_GAP)
      // Gruppens namn och antal
      ctx.fillStyle = '#111827'
      ctx.font = `700 13px ${FONT}`
      ctx.fillText(g.label, x, y + GROUP_HEAD / 2)
      const lw = ctx.measureText(g.label).width
      ctx.fillStyle = '#6b7280'
      ctx.font = `400 11px ${FONT}`
      ctx.fillText(`(${g.players.length})`, x + lw + 5, y + GROUP_HEAD / 2)

      let py = y + GROUP_HEAD
      g.players.forEach((p, pi) => {
        const cy = py + LINE_H / 2
        ctx.fillStyle = '#111827'
        ctx.font = `400 12px ${FONT}`
        const name = `${p.name}${p.goalkeeper ? ' (MV)' : ''}`
        ctx.fillText(fitText(ctx, name, (p.rank ? BADGE_X : COL_W) - 8), x, cy)
        if (p.rank) {
          ctx.font = `700 9px ${FONT}`
          const bw = Math.max(16, ctx.measureText(p.rank).width + 8)
          ctx.fillStyle = RANK_COLOR[p.rank.toUpperCase()] ?? '#B7B7B7'
          ctx.beginPath()
          ctx.roundRect(x + BADGE_X, cy - 7.5, bw, 15, 3)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.fillText(p.rank, x + BADGE_X + bw / 2, cy + 0.5)
          ctx.textAlign = 'left'
        }
        if (pi < g.players.length - 1) {
          ctx.strokeStyle = '#eef0f2'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x, py + LINE_H - 0.5)
          ctx.lineTo(x + COL_W, py + LINE_H - 0.5)
          ctx.stroke()
        }
        py += LINE_H
      })
      if (g.players.length === 0) {
        ctx.fillStyle = '#9ca3af'
        ctx.font = `400 12px ${FONT}`
        ctx.fillText('Inga spelare', x, py + LINE_H / 2)
      }
    })
    y += rowHeights[ri] + ROW_GAP
  })
}

/** Grupperna som text, t.ex. för att klistra in i ett meddelande. */
export function groupsText(groups: ImageGroup[], title: string) {
  return [
    title,
    ...groups.map((g) => `\n${g.label} (${g.players.length})\n${g.players.map((p) => `- ${p.name}${p.goalkeeper ? ' (MV)' : ''}`).join('\n')}`),
  ].join('\n')
}
