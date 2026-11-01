import 'server-only'

export const GAME_FORMATS = ['3v3', '5v5', '7v7', '9v9', '11v11'] as const
export const INTENSITIES = ['Låg', 'Medel', 'Hög'] as const
export const LEVELS = ['Lätt', 'Medel', 'Svår'] as const

/** Kolumner för en övning, som camelCase. */
export const DRILL_COLUMNS = `d.id, d.name, d.summary, d.description, d.coaching,
  d.game_formats AS "gameFormats", d.categories, d.duration_minutes AS "durationMinutes",
  d.players_min AS "playersMin", d.players_max AS "playersMax", d.area, d.equipment, d.intensity,
  d.video_url AS "videoUrl", d.diagram, d.levels, d.starter_key AS "starterKey", d.updated_at AS "updatedAt"`

export type DrillLevel = { text?: string | null; diagram?: unknown | null }

export type DrillRow = {
  id: number
  name: string
  summary: string | null
  description: string | null
  coaching: string | null
  gameFormats: string[]
  categories: string[]
  durationMinutes: number | null
  playersMin: number | null
  playersMax: number | null
  area: string | null
  equipment: string | null
  intensity: string | null
  videoUrl: string | null
  diagram: unknown | null
  levels: Partial<Record<(typeof LEVELS)[number], DrillLevel>>
  starterKey: string | null
  updatedAt: string
}

export function cleanText(v: unknown, max = 4000): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export function cleanInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Ritningar är JSON från appen: begränsa storleken. */
export function cleanDiagram(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null
  const s = JSON.stringify(v)
  if (s.length > 200_000) throw new Error('Ritningen är för stor.')
  return s
}
