import { FONT, fit } from '../planning/OverviewDialog'

export type PlanImageItem = {
  group: string | null
  name: string
  level: string | null
  levelColor: string | null
  holders: string
  levelText: string | null
  coaching: string[]
  notes: string | null
  /** Ritningen som den visas på sidan (svg-elementet), om övningen har en */
  svg: SVGSVGElement | null
}
export type PlanImageBlock = { start: string | null; name: string; minutes: number; notes: string | null; items: PlanImageItem[] }
export type PlanImageData = {
  title: string
  subtitle: string
  roaming: string
  blocks: PlanImageBlock[]
  primary: string
  accent: string
}
export type PlanImageOptions = { diagrams: boolean; coaching: boolean }

const W = 720
const PAD = 16
const DIA_W = 220

/** Ritningen som bild, från samma SVG som sidan visar. */
function diagramImage(el: SVGSVGElement): Promise<HTMLImageElement | null> {
  const clone = el.cloneNode(true) as SVGSVGElement
  const vb = el.viewBox.baseVal
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.removeAttribute('class')
  // Fast storlek så att bilden får rätt proportioner
  if (vb && vb.width) {
    clone.setAttribute('width', String(Math.round(vb.width * 20)))
    clone.setAttribute('height', String(Math.round(vb.height * 20)))
  }
  const svg = new XMLSerializer().serializeToString(clone)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

/** Radbryter text till en bredd. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width > max && line) {
        lines.push(line)
        line = word
      } else line = next
    }
    if (line) lines.push(line)
  }
  return lines
}

/** Ritar träningsplanen som en bild att skicka till ledare. */
export async function drawPlan(canvas: HTMLCanvasElement, data: PlanImageData, opts: PlanImageOptions) {
  // Ritningarna laddas först, så att höjden blir rätt
  const images = new Map<PlanImageItem, HTMLImageElement>()
  if (opts.diagrams) {
    await Promise.all(data.blocks.flatMap((b) => b.items).map(async (i) => {
      if (!i.svg) return
      const img = await diagramImage(i.svg)
      if (img) images.set(i, img)
    }))
  }

  const run = (ctx: CanvasRenderingContext2D, draw: boolean) => {
    const text = (s: string, x: number, y: number, font: string, color: string, max?: number) => {
      ctx.font = font
      if (draw) {
        ctx.fillStyle = color
        ctx.fillText(max ? fit(ctx, s, max) : s, x, y)
      }
    }
    ctx.textBaseline = 'top'
    let y = 0

    // Rubrik i lagets färg
    const headH = data.roaming ? 86 : 66
    if (draw) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, ctx.canvas.height)
      ctx.fillStyle = data.primary
      ctx.fillRect(0, 0, W, headH)
    }
    text('TRÄNINGSPLAN', PAD, 12, `600 10px ${FONT}`, data.accent)
    text(data.title, PAD, 25, `700 20px ${FONT}`, data.accent, W - PAD * 2)
    text(data.subtitle, PAD, 49, `400 12px ${FONT}`, data.accent, W - PAD * 2)
    if (data.roaming) text(`Snurrande ledare: ${data.roaming}`, PAD, 66, `600 12px ${FONT}`, data.accent, W - PAD * 2)
    y = headH + 12

    for (const b of data.blocks) {
      // Blockrubrik
      if (draw) {
        ctx.fillStyle = '#f3f4f6'
        ctx.beginPath()
        ctx.roundRect(PAD, y, W - PAD * 2, 28, 6)
        ctx.fill()
      }
      let x = PAD + 10
      if (b.start) {
        text(b.start, x, y + 8, `600 11px ${FONT}`, '#6b7280')
        x += 46
      }
      text(b.name, x, y + 7, `700 13px ${FONT}`, '#111827', W - PAD * 2 - (x - PAD) - 60)
      if (b.minutes) {
        ctx.font = `400 11px ${FONT}`
        const m = `${b.minutes} min`
        text(m, W - PAD - 10 - ctx.measureText(m).width, y + 8, `400 11px ${FONT}`, '#6b7280')
      }
      y += 34
      if (b.notes) {
        ctx.font = `400 11px ${FONT}`
        for (const l of wrap(ctx, b.notes, W - PAD * 2 - 20)) {
          text(l, PAD + 10, y, `400 11px ${FONT}`, '#6b7280')
          y += 15
        }
        y += 4
      }

      for (const i of b.items) {
        const img = images.get(i)
        const dh = img ? Math.round((DIA_W * img.height) / img.width) : 0
        const tx = img ? PAD + 10 + DIA_W + 14 : PAD + 10
        const tw = W - PAD - 10 - tx
        if (img && draw) ctx.drawImage(img, PAD + 10, y, DIA_W, dh)

        let ty = y
        // Grupp, namn och nivå på samma rad
        let cx = tx
        if (i.group) {
          ctx.font = `600 10px ${FONT}`
          const gw = ctx.measureText(i.group).width + 12
          if (draw) {
            ctx.fillStyle = '#e8eefc'
            ctx.beginPath()
            ctx.roundRect(cx, ty, gw, 17, 8)
            ctx.fill()
          }
          text(i.group, cx + 6, ty + 3.5, `600 10px ${FONT}`, '#1d4ed8')
          cx += gw + 6
        }
        ctx.font = `700 13px ${FONT}`
        const levelW = i.level ? ctx.measureText(i.level).width + 26 : 0
        const name = fit(ctx, i.name, tx + tw - cx - levelW)
        text(name, cx, ty + 1, `700 13px ${FONT}`, '#111827')
        cx += ctx.measureText(name).width + 6
        if (i.level) {
          ctx.font = `600 10px ${FONT}`
          const lw = ctx.measureText(i.level).width + 12
          if (draw) {
            ctx.fillStyle = i.levelColor ?? '#6b7280'
            ctx.beginPath()
            ctx.roundRect(cx, ty + 0.5, lw, 16, 8)
            ctx.fill()
          }
          text(i.level, cx + 6, ty + 3.5, `600 10px ${FONT}`, '#ffffff')
        }
        ty += 22

        const lines = (s: string, font: string, color: string, lh: number, indent = 0, bullet = false) => {
          ctx.font = font
          wrap(ctx, s, tw - indent).forEach((l, n) => {
            if (bullet && n === 0 && draw) {
              ctx.fillStyle = data.primary
              ctx.beginPath()
              ctx.arc(tx + 3, ty + lh / 2 - 1, 2.2, 0, Math.PI * 2)
              ctx.fill()
            }
            text(l, tx + indent, ty, font, color)
            ty += lh
          })
        }
        if (i.holders) lines(`Ansvarig: ${i.holders}`, `600 12px ${FONT}`, '#111827', 16)
        if (i.notes) lines(i.notes, `italic 400 11px ${FONT}`, '#6b7280', 15)
        if (i.levelText) {
          const top = ty
          ty += 3
          lines(i.levelText, `400 11px ${FONT}`, '#374151', 15, 8)
          if (draw) {
            ctx.fillStyle = i.levelColor ?? '#9ca3af'
            ctx.fillRect(tx, top + 1, 3, ty - top)
          }
          ty += 4
        }
        if (opts.coaching) for (const c of i.coaching) lines(c, `400 11px ${FONT}`, '#374151', 15, 11, true)

        y = Math.max(y + dh, ty) + 14
      }
      y += 4
    }
    return y + 4
  }

  // Först mäts höjden, sedan ritas bilden
  const probe = document.createElement('canvas').getContext('2d')!
  const height = run(probe, false)
  const scale = 2
  canvas.width = W * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  run(ctx, true)
}
