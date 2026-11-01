import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { GAME_FORMATS, INTENSITIES, LEVELS, cleanDiagram, cleanInt, cleanText } from '@/server/drills/shared'
import type { User } from '@/server/types'

type Params = {
  /** Saknas för en ny övning. */
  id?: number | null
  name: string
  summary?: string | null
  description?: string | null
  coaching?: string | null
  gameFormats?: string[]
  categories?: string[]
  durationMinutes?: number | null
  playersMin?: number | null
  playersMax?: number | null
  area?: string | null
  equipment?: string | null
  intensity?: string | null
  videoUrl?: string | null
  diagram?: unknown
  levels?: Record<string, { text?: string | null; diagram?: unknown }>
}

/** Skapa eller uppdatera en övning i föreningens övningsbank. */
export default async function saveDrill(req: { params: Params; user: User }) {
  const p = req.params
  const name = cleanText(p.name, 120)
  if (!name) throw new AccessError('Övningen måste ha ett namn.', 400)
  const formats = (p.gameFormats ?? []).filter((f) => (GAME_FORMATS as readonly string[]).includes(f))
  const categories = [...new Set((p.categories ?? []).map((c) => cleanText(c, 40)).filter((c): c is string => !!c))].slice(0, 12)
  const intensity = p.intensity && (INTENSITIES as readonly string[]).includes(p.intensity) ? p.intensity : null
  const video = cleanText(p.videoUrl, 500)
  if (video && !/^https:\/\//.test(video)) throw new AccessError('Videolänken måste börja med https://', 400)
  let min = cleanInt(p.playersMin, 1, 60)
  let max = cleanInt(p.playersMax, 1, 60)
  if (min != null && max != null && min > max) [min, max] = [max, min]

  const levels: Record<string, { text: string | null; diagram: unknown | null }> = {}
  for (const l of LEVELS) {
    const v = p.levels?.[l]
    if (!v) continue
    const text = cleanText(v.text, 2000)
    const diagram = cleanDiagram(v.diagram)
    if (text || diagram) levels[l] = { text, diagram: diagram ? JSON.parse(diagram) : null }
  }

  const values = [
    name,
    cleanText(p.summary, 500),
    cleanText(p.description),
    cleanText(p.coaching, 2000),
    formats,
    categories,
    cleanInt(p.durationMinutes, 1, 180),
    min,
    max,
    cleanText(p.area, 60),
    cleanText(p.equipment, 300),
    intensity,
    video,
    cleanDiagram(p.diagram),
    JSON.stringify(levels),
  ]

  if (p.id) {
    const { data } = await db.query<{ id: number }>(
      `UPDATE drills SET name = $2, summary = $3, description = $4, coaching = $5, game_formats = $6,
         categories = $7, duration_minutes = $8, players_min = $9, players_max = $10, area = $11,
         equipment = $12, intensity = $13, video_url = $14, diagram = $15::jsonb, levels = $16::jsonb,
         updated_at = now()
       WHERE id = $1 RETURNING id`,
      [p.id, ...values],
    )
    if (!data[0]) throw new AccessError('Övningen finns inte.', 404)
    return { id: data[0].id }
  }
  const { data } = await db.query<{ id: number }>(
    `INSERT INTO drills (name, summary, description, coaching, game_formats, categories, duration_minutes,
       players_min, players_max, area, equipment, intensity, video_url, diagram, levels, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16)
     RETURNING id`,
    [...values, req.user.id],
  )
  return { id: data[0].id }
}
