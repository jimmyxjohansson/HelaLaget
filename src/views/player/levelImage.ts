import { FONT, fit } from '../planning/OverviewDialog'
import { RANK_COLOR } from '../../utils/rankColors'
import { GRADES, areaScore, gradeOf, type Matrix, type Scores } from '../../utils/levelMatrix'

export type LevelImageData = {
  player: string
  matrix: Matrix
  scores: Scores
  suggested: string | null
  /** Nivån som satts eller ska sättas, om den skiljer sig från förslaget */
  rank: string | null
  date: string
  by: string | null
  comment: string
  primary: string
  accent: string
}
export type LevelImageOptions = { descriptions: boolean; mentalSocial: boolean }

const W = 640
const PAD = 16

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Bedömningen enligt nivåmatrisen som en bild att skicka till ledare. */
export function drawLevel(canvas: HTMLCanvasElement, d: LevelImageData, opts: LevelImageOptions) {
  const areas = d.matrix.areas.filter((a) => opts.mentalSocial || a.weight > 0)

  const run = (ctx: CanvasRenderingContext2D, draw: boolean) => {
    ctx.textBaseline = 'top'
    const text = (s: string, x: number, y: number, font: string, color: string, max?: number) => {
      ctx.font = font
      if (draw) {
        ctx.fillStyle = color
        ctx.fillText(max ? fit(ctx, s, max) : s, x, y)
      }
    }
    const chip = (label: string, x: number, y: number, h: number, size: number) => {
      ctx.font = `700 ${size}px ${FONT}`
      const w = Math.max(h, ctx.measureText(label).width + h * 0.7)
      if (draw) {
        ctx.fillStyle = RANK_COLOR[label] ?? '#B7B7B7'
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, h / 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText(label, x + w / 2, y + (h - size) / 2 + 1)
        ctx.textAlign = 'left'
      }
      return w
    }

    // Rubrik i lagets färg
    const headH = 78
    if (draw) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, ctx.canvas.height)
      ctx.fillStyle = d.primary
      ctx.fillRect(0, 0, W, headH)
    }
    text('NIVÅBEDÖMNING', PAD, 12, `600 10px ${FONT}`, d.accent)
    text(d.player, PAD, 26, `700 20px ${FONT}`, d.accent, W - PAD * 2)
    text([d.matrix.name, d.date, d.by].filter(Boolean).join(' · '), PAD, 52, `400 12px ${FONT}`, d.accent, W - PAD * 2)
    let y = headH + 14

    // Resultat
    text('Föreslagen nivå', PAD, y + 7, `600 13px ${FONT}`, '#111827')
    ctx.font = `600 13px ${FONT}`
    let x = PAD + ctx.measureText('Föreslagen nivå').width + 10
    x += (d.suggested ? chip(d.suggested, x, y, 28, 15) : 0) + 16
    if (d.rank && d.rank !== d.suggested) {
      text('Satt nivå', x, y + 7, `600 13px ${FONT}`, '#111827')
      ctx.font = `600 13px ${FONT}`
      x += ctx.measureText('Satt nivå').width + 10
      chip(d.rank, x, y, 28, 15)
    }
    y += 36
    const summary = d.matrix.areas.filter((a) => a.weight > 0).map((a) => {
      const s = areaScore(a, d.scores)
      return `${a.name} ${s != null ? gradeOf(s) : '–'} (${Math.round(a.weight * 100)} %)`
    }).join(' · ')
    text(summary, PAD, y, `400 12px ${FONT}`, '#6b7280', W - PAD * 2)
    y += 26

    for (const a of areas) {
      // Områdets rubrik
      if (draw) {
        ctx.fillStyle = '#f3f4f6'
        ctx.beginPath()
        ctx.roundRect(PAD, y, W - PAD * 2, 28, 6)
        ctx.fill()
      }
      text(`${a.name}${a.weight ? ` · ${Math.round(a.weight * 100)} %` : ' · räknas inte in'}`, PAD + 10, y + 8, `700 13px ${FONT}`, '#111827', W - PAD * 2 - 90)
      const s = areaScore(a, d.scores)
      if (s != null) {
        const label = `Snitt ${gradeOf(s)}`
        ctx.font = `400 11px ${FONT}`
        text(label, W - PAD - 10 - ctx.measureText(label).width, y + 9, `400 11px ${FONT}`, '#6b7280')
      }
      y += 36

      for (const c of a.criteria) {
        const g = d.scores[c.key]
        const nameX = PAD + 10
        if (g && (GRADES as string[]).includes(g)) chip(g, nameX, y - 1, 20, 11)
        else text('–', nameX + 6, y + 2, `600 12px ${FONT}`, '#9ca3af')
        text(c.name, nameX + 30, y + 2, `600 12px ${FONT}`, '#111827', W - PAD * 2 - 40)
        y += 22
        if (opts.descriptions) {
          ctx.font = `400 11px ${FONT}`
          const desc = g ? c.levels[g] : 'Inte bedömd.'
          for (const l of wrap(ctx, desc, W - PAD * 2 - 40)) {
            text(l, nameX + 30, y, `400 11px ${FONT}`, g ? '#374151' : '#9ca3af')
            y += 15
          }
        }
        y += 8
      }
      y += 4
    }

    if (d.comment.trim()) {
      text('KOMMENTAR', PAD, y, `700 9px ${FONT}`, '#6b7280')
      y += 14
      ctx.font = `400 12px ${FONT}`
      for (const l of wrap(ctx, d.comment.trim(), W - PAD * 2)) {
        text(l, PAD, y, `400 12px ${FONT}`, '#111827')
        y += 16
      }
      y += 6
    }
    return y + 8
  }

  const probe = document.createElement('canvas').getContext('2d')!
  const height = run(probe, false)
  const scale = 2
  canvas.width = W * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  run(ctx, true)
}
