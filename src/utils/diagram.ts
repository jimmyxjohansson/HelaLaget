/**
 * Ritningar för övningar: en plan (bredd × längd i meter) med koner, spelare,
 * bollar, mål, zoner, text och pilar. Koordinater i meter från övre vänstra
 * hörnet. Sparas som JSON i drills.diagram och i nivåerna.
 */

export type Pt = { x: number; y: number }

export type ConeColor = 'orange' | 'yellow' | 'blue' | 'red' | 'white'
/**
 * Spelare: färgade prickar (A röd, B blå, Y gul, O orange, P lila), målvakt (GK)
 * och ledare (L). N är den gamla gula pricken (neutral) och visas som gul.
 */
export type Team = 'A' | 'B' | 'Y' | 'O' | 'P' | 'GK' | 'L' | 'N'
export type ArrowStyle = 'pass' | 'run' | 'dribble' | 'shot' | 'line'
export type LineColor = 'white' | 'yellow' | 'red' | 'blue' | 'orange' | 'black'
/** Mål: småmål och matchmål för 7, 9 och 11 mot 11. 'large' är det gamla stora målet. */
export type GoalSize = 'small' | 'g7' | 'g9' | 'g11' | 'large'

export type Shape =
  | { id: string; kind: 'cone'; x: number; y: number; color: ConeColor }
  | { id: string; kind: 'player'; x: number; y: number; team: Team; label?: string }
  | { id: string; kind: 'ball'; x: number; y: number }
  | { id: string; kind: 'goal'; x: number; y: number; size: GoalSize; rot: number }
  | { id: string; kind: 'pole'; x: number; y: number }
  | { id: string; kind: 'zone'; x: number; y: number; w: number; h: number; color: ConeColor }
  | { id: string; kind: 'text'; x: number; y: number; text: string }
  | { id: string; kind: 'arrow'; style: ArrowStyle; from: Pt; to: Pt; bend?: number; color?: LineColor }

export type Pitch = 'plain' | 'half' | 'full'

export type Diagram = {
  width: number
  height: number
  pitch: Pitch
  shapes: Shape[]
}

export const LEVELS = ['Lätt', 'Medel', 'Svår'] as const
export type Level = (typeof LEVELS)[number]

export const CONE_HEX: Record<ConeColor, string> = {
  orange: '#f97316',
  yellow: '#facc15',
  blue: '#3b82f6',
  red: '#ef4444',
  white: '#f8fafc',
}

export const TEAM_HEX: Record<Team, { fill: string; text: string; name: string }> = {
  A: { fill: '#dc2626', text: '#fff', name: 'Röd' },
  B: { fill: '#2563eb', text: '#fff', name: 'Blå' },
  Y: { fill: '#facc15', text: '#1f2937', name: 'Gul' },
  O: { fill: '#f97316', text: '#fff', name: 'Orange' },
  P: { fill: '#9333ea', text: '#fff', name: 'Lila' },
  GK: { fill: '#16a34a', text: '#fff', name: 'Målvakt' },
  L: { fill: '#1f2937', text: '#fff', name: 'Ledare' },
  N: { fill: '#facc15', text: '#1f2937', name: 'Gul' },
}

/** Prickarna i den ordning de visas i verktygen. */
export const DOT_TEAMS: Team[] = ['A', 'B', 'Y', 'O', 'P']

export const ARROW_NAME: Record<ArrowStyle, string> = {
  pass: 'Passning',
  run: 'Löpning',
  dribble: 'Dribbling',
  shot: 'Skott',
  line: 'Linje',
}

export const LINE_HEX: Record<LineColor, string> = {
  white: '#ffffff',
  yellow: '#fde047',
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#fb923c',
  black: '#111827',
}

/** Linjens färg: vald färg, annars gul för skott och vit för övriga. */
export function lineColor(s: { style: ArrowStyle; color?: LineColor }): LineColor {
  return s.color ?? (s.style === 'shot' ? 'yellow' : 'white')
}

export const GOAL_SIZES: { value: GoalSize; label: string; meters: number | null }[] = [
  { value: 'small', label: 'Småmål', meters: 1.5 },
  { value: 'g7', label: 'Mål 7 mot 7', meters: 5 },
  { value: 'g9', label: 'Mål 9 mot 9', meters: 6 },
  { value: 'g11', label: 'Mål 11 mot 11', meters: 7.32 },
]

/** Matchmål, som ger straffområde på halvplan. */
export function isBigGoal(size: GoalSize) {
  return size !== 'small'
}

export function emptyDiagram(width = 30, height = 20, pitch: Pitch = 'plain'): Diagram {
  return { width, height, pitch, shapes: [] }
}

/** Storlek på symboler, så att de syns lika bra på liten och stor yta. */
export function unit(d: Pick<Diagram, 'width' | 'height'>) {
  return Math.max(0.55, Math.min(2.2, Math.max(d.width, d.height) / 34))
}

let counter = 0
export function newId() {
  counter = (counter + 1) % 1e6
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

export function isDiagram(v: unknown): v is Diagram {
  return !!v && typeof v === 'object' && Array.isArray((v as Diagram).shapes) && typeof (v as Diagram).width === 'number'
}

export function cloneDiagram(d: Diagram): Diagram {
  return JSON.parse(JSON.stringify(d))
}

/** Flytta en figur. */
export function moveShape(s: Shape, dx: number, dy: number): Shape {
  if (s.kind === 'arrow') {
    return { ...s, from: { x: s.from.x + dx, y: s.from.y + dy }, to: { x: s.to.x + dx, y: s.to.y + dy } }
  }
  return { ...s, x: s.x + dx, y: s.y + dy }
}

export const snap = (v: number, step = 0.5) => Math.round(v / step) * step
