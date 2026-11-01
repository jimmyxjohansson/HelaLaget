/**
 * Ritningar för övningar: en plan (bredd × längd i meter) med koner, spelare,
 * bollar, mål, zoner, text och pilar. Koordinater i meter från övre vänstra
 * hörnet. Sparas som JSON i drills.diagram och i nivåerna.
 */

export type Pt = { x: number; y: number }

export type ConeColor = 'orange' | 'yellow' | 'blue' | 'red' | 'white'
export type Team = 'A' | 'B' | 'N' | 'GK'
export type ArrowStyle = 'pass' | 'run' | 'dribble' | 'shot'

export type Shape =
  | { id: string; kind: 'cone'; x: number; y: number; color: ConeColor }
  | { id: string; kind: 'player'; x: number; y: number; team: Team; label?: string }
  | { id: string; kind: 'ball'; x: number; y: number }
  | { id: string; kind: 'goal'; x: number; y: number; size: 'small' | 'large'; rot: number }
  | { id: string; kind: 'pole'; x: number; y: number }
  | { id: string; kind: 'zone'; x: number; y: number; w: number; h: number; color: ConeColor }
  | { id: string; kind: 'text'; x: number; y: number; text: string }
  | { id: string; kind: 'arrow'; style: ArrowStyle; from: Pt; to: Pt; bend?: number }

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
  A: { fill: '#dc2626', text: '#fff', name: 'Lag röd' },
  B: { fill: '#2563eb', text: '#fff', name: 'Lag blå' },
  N: { fill: '#facc15', text: '#1f2937', name: 'Neutral' },
  GK: { fill: '#16a34a', text: '#fff', name: 'Målvakt' },
}

export const ARROW_NAME: Record<ArrowStyle, string> = {
  pass: 'Passning',
  run: 'Löpning',
  dribble: 'Dribbling',
  shot: 'Skott',
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
