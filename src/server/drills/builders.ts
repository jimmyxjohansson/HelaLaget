import 'server-only'

/** Byggklossar för startpaketets ritningar. Se starter.ts. */

export type ConeColor = 'orange' | 'yellow' | 'blue' | 'red' | 'white'
export type Team = 'A' | 'B' | 'N' | 'GK'
export type S = Record<string, unknown> & { kind: string }

export const cone = (x: number, y: number, color: ConeColor = 'orange'): S => ({ kind: 'cone', x, y, color })
export const p = (team: Team, x: number, y: number, label = ''): S => ({ kind: 'player', x, y, team, label })
export const ball = (x: number, y: number): S => ({ kind: 'ball', x, y })
/** Mål vid vänster kortsida (nät åt vänster), höger, övre eller nedre. */
export const goalL = (x: number, y: number, size: 'small' | 'large' = 'small'): S => ({ kind: 'goal', x, y, size, rot: 270 })
export const goalR = (x: number, y: number, size: 'small' | 'large' = 'small'): S => ({ kind: 'goal', x, y, size, rot: 90 })
export const goalT = (x: number, y: number, size: 'small' | 'large' = 'small'): S => ({ kind: 'goal', x, y, size, rot: 0 })
export const goalB = (x: number, y: number, size: 'small' | 'large' = 'small'): S => ({ kind: 'goal', x, y, size, rot: 180 })
export const arrow = (style: 'pass' | 'run' | 'dribble' | 'shot') => (x1: number, y1: number, x2: number, y2: number, bend?: number): S =>
  ({ kind: 'arrow', style, from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, ...(bend ? { bend } : {}) })
export const pass = arrow('pass')
export const run = arrow('run')
export const drib = arrow('dribble')
export const shot = arrow('shot')
export const zone = (x: number, y: number, w: number, h: number, color: ConeColor = 'blue'): S => ({ kind: 'zone', x, y, w, h, color })
export const text = (x: number, y: number, t: string): S => ({ kind: 'text', x, y, text: t })
/** Fyra koner i hörnen på en rektangel. */
export const square = (x: number, y: number, w: number, h: number, color: ConeColor = 'orange') =>
  [cone(x, y, color), cone(x + w, y, color), cone(x, y + h, color), cone(x + w, y + h, color)]
/** Port av två koner. */
export const gate = (x: number, y: number, vertical = false, width = 2, color: ConeColor = 'yellow') =>
  vertical ? [cone(x, y - width / 2, color), cone(x, y + width / 2, color)] : [cone(x - width / 2, y, color), cone(x + width / 2, y, color)]

export function diagram(width: number, height: number, pitch: 'plain' | 'half' | 'full', ...shapes: (S | S[])[]) {
  return { width, height, pitch, shapes: shapes.flat().map((s, i) => ({ id: `s${i + 1}`, ...s })) }
}

export type StarterDrill = {
  key: string
  name: string
  summary: string
  description: string
  coaching: string[]
  gameFormats: string[]
  categories: string[]
  durationMinutes: number
  playersMin: number
  playersMax: number
  area: string
  equipment: string
  intensity: 'Låg' | 'Medel' | 'Hög'
  diagram: ReturnType<typeof diagram>
  levels: Partial<Record<'Lätt' | 'Medel' | 'Svår', { text: string; diagram?: ReturnType<typeof diagram> }>>
}

