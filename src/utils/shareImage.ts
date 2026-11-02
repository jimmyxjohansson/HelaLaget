'use client'

/** Kopiera, dela och ladda ner en bild som ritats på en canvas. */

export function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunde inte skapa bilden.'))), 'image/png'),
  )
}

export function canCopyImage() {
  return typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write
}

export function canShareImage() {
  try {
    return typeof navigator !== 'undefined' && !!navigator.canShare &&
      navigator.canShare({ files: [new File([], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

export async function copyImage(canvas: HTMLCanvasElement) {
  // Promise direkt i ClipboardItem: krävs av Safari för att kopieringen ska räknas som ett knapptryck
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasBlob(canvas) })])
}

export async function shareImage(canvas: HTMLCanvasElement, fileName: string, title: string) {
  const file = new File([await canvasBlob(canvas)], fileName, { type: 'image/png' })
  await navigator.share({ files: [file], title })
}

export async function downloadImage(canvas: HTMLCanvasElement, fileName: string) {
  const url = URL.createObjectURL(await canvasBlob(canvas))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Kortar text så att den får plats, med … på slutet. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}
