import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  context?: 'training' | 'match' | null
  /** Träningens eller matchens miljö, för information som bara gäller inomhus eller utomhus */
  indooroutdoor?: string | null
  /** Matchens hemma/borta */
  homeaway?: string | null
}

export type SquadInfo = {
  id: number
  title: string
  body: string
  onTrainings: boolean
  onMatches: boolean
  audience: 'leaders' | 'all'
  position: number
  onlyIndoorOutdoor: 'Inomhus' | 'Utomhus' | null
  onlyHomeAway: 'Hemma' | 'Borta' | null
}

/**
 * Lagets information för en träning eller match (eller allt, utan context).
 * Spelare och anhöriga ser bara det som är markerat för alla (RLS).
 */
export default async function getSquadInfos(req: { params: Params; user: User }) {
  const ctx = req.params.context ?? null
  const { data } = await db.query<SquadInfo>(
    `SELECT id, title, body, on_trainings AS "onTrainings", on_matches AS "onMatches", audience, position,
            only_indooroutdoor AS "onlyIndoorOutdoor", only_homeaway AS "onlyHomeAway"
     FROM squad_infos
     WHERE ($1::text IS NULL OR ($1 = 'training' AND on_trainings) OR ($1 = 'match' AND on_matches))
       -- Villkoren gäller bara när en träning eller match visas (utan context listas allt)
       AND ($1::text IS NULL OR only_indooroutdoor IS NULL OR only_indooroutdoor = $2)
       AND ($1::text IS NULL OR $1 <> 'match' OR only_homeaway IS NULL OR only_homeaway = $3)
     ORDER BY position, id`,
    [ctx, req.params.indooroutdoor ?? null, req.params.homeaway ?? null],
  )
  return data
}
