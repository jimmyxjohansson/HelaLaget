'use client'

import { RANK_COLOR } from '../../utils/rankColors'
import { fitText } from '../../utils/shareImage'

export type ImageGroup = {
  label: string
  players: { name: string; rank: string | null; goalkeeper?: boolean }[]
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const COL_W = 180
const GAP = 10
const PAD = 14
const HEAD_H = 54
const GROUP_HEAD = 30
const LINE_H = 19
const MAX_COLS = 4

/**
 * Ritar träningsgrupperna som en bild att skicka: rubrik i lagets färg och
 * en kolumn per grupp med spelarna och deras rank.
 */
export function drawGroups(
  canvas: HTMLCanvasElement,
  groups: ImageGroup[],
  opts: { title: string; subtitle: string; primary: string; accent: string },
) {
  const scale = 2
  const cols = Math.max(1, Math.min(MAX_COLS, groups.length))
  const rows: ImageGroup[][] = []
  for (let i = 0; i < groups.length; i += cols) rows.push(groups.slice(i, i + cols))
  const colHeight = (g: ImageGroup) => GROUP_HEAD + Math.max(1, g.players.length) * LINE_H + 8
  const rowHeights = rows.map((r) => Math.max(...r.map(colHeight)))
  const width = PAD * 2 + cols * COL_W + (cols - 1) * GAP
  const height = HEAD_H + PAD + rowHeights.reduce((a, h) => a + h, 0) + Math.max(0, rows.length - 1) * GAP + PAD

  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Rubrik i lagets färg
  ctx.fillStyle = opts.primary
  ctx.fillRect(0, 0, width, HEAD_H)
  ctx.fillStyle = opts.accent
  ctx.font = `700 16px ${FONT}`
  ctx.fillText(fitText(ctx, opts.title, width - PAD * 2), PAD, 20)
  ctx.font = `400 12px ${FONT}`
  ctx.fillText(fitText(ctx, opts.subtitle, width - PAD * 2), PAD, 38)

  let y = HEAD_H + PAD
  rows.forEach((row, ri) => {
    row.forEach((g, ci) => {
      const x = PAD + ci * (COL_W + GAP)
      const h = rowHeights[ri]
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x + 0.5, y + 0.5, COL_W - 1, h - 1, 8)
      ctx.stroke()

      ctx.fillStyle = '#f3f4f6'
      ctx.beginPath()
      ctx.roundRect(x + 1, y + 1, COL_W - 2, GROUP_HEAD - 4, [7, 7, 0, 0])
      ctx.fill()
      ctx.fillStyle = '#111827'
      ctx.font = `700 13px ${FONT}`
      const count = `${g.players.length}`
      ctx.textAlign = 'right'
      ctx.fillStyle = '#6b7280'
      ctx.font = `400 11px ${FONT}`
      ctx.fillText(count, x + COL_W - 9, y + GROUP_HEAD / 2 - 1)
      const cw = ctx.measureText(count).width
      ctx.textAlign = 'left'
      ctx.fillStyle = '#111827'
      ctx.font = `700 13px ${FONT}`
      ctx.fillText(fitText(ctx, g.label, COL_W - 26 - cw), x + 9, y + GROUP_HEAD / 2 - 1)

      let py = y + GROUP_HEAD + 2
      if (g.players.length === 0) {
        ctx.fillStyle = '#9ca3af'
        ctx.font = `400 12px ${FONT}`
        ctx.fillText('Inga spelare', x + 9, py + LINE_H / 2)
      }
      for (const p of g.players) {
        const cy = py + LINE_H / 2
        const rankX = x + COL_W - 9
        let badgeW = 0
        if (p.rank) {
          ctx.font = `700 9px ${FONT}`
          badgeW = ctx.measureText(p.rank).width + 8
          ctx.fillStyle = RANK_COLOR[p.rank.toUpperCase()] ?? '#B7B7B7'
          ctx.beginPath()
          ctx.roundRect(rankX - badgeW, cy - 6.5, badgeW, 13, 3)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.fillText(p.rank, rankX - badgeW + 4, cy + 0.5)
        }
        ctx.fillStyle = '#111827'
        ctx.font = `400 12px ${FONT}`
        const name = `${p.name}${p.goalkeeper ? ' (MV)' : ''}`
        ctx.fillText(fitText(ctx, name, COL_W - 24 - badgeW), x + 9, cy)
        py += LINE_H
      }
    })
    y += rowHeights[ri] + GAP
  })
}

/** Grupperna som text, t.ex. för att klistra in i ett meddelande. */
export function groupsText(groups: ImageGroup[], title: string) {
  return [
    title,
    ...groups.map((g) => `\n${g.label} (${g.players.length})\n${g.players.map((p) => `- ${p.name}${p.goalkeeper ? ' (MV)' : ''}`).join('\n')}`),
  ].join('\n')
}
