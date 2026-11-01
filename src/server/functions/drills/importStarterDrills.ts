import { db } from '@/server/db'
import { STARTER_DRILLS } from '@/server/drills/starter'
import type { User } from '@/server/types'

type Params = Record<string, never>

/**
 * Lägg in startpaketets övningar i föreningens bank. Övningar som redan
 * finns (samma starter_key) hoppas över, så knappen kan tryckas igen när
 * startpaketet fått nya övningar.
 */
export default async function importStarterDrills(req: { params: Params; user: User }) {
  let added = 0
  for (const d of STARTER_DRILLS) {
    const { data } = await db.query<{ id: number }>(
      `INSERT INTO drills (name, summary, description, coaching, game_formats, categories, duration_minutes,
         players_min, players_max, area, equipment, intensity, diagram, levels, starter_key, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16)
       ON CONFLICT (organization_id, starter_key) WHERE starter_key IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        d.name, d.summary, d.description, d.coaching.join('\n'), d.gameFormats, d.categories, d.durationMinutes,
        d.playersMin, d.playersMax, d.area, d.equipment, d.intensity, JSON.stringify(d.diagram),
        JSON.stringify(d.levels), d.key, req.user.id,
      ],
    )
    added += data.length
  }
  return { added, total: STARTER_DRILLS.length }
}
