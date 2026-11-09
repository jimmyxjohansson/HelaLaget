import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { context?: 'training' | 'match' | null }

export type SquadInfo = {
  id: number
  title: string
  body: string
  onTrainings: boolean
  onMatches: boolean
  audience: 'leaders' | 'all'
  position: number
}

/**
 * Lagets information för en träning eller match (eller allt, utan context).
 * Spelare och anhöriga ser bara det som är markerat för alla (RLS).
 */
export default async function getSquadInfos(req: { params: Params; user: User }) {
  const ctx = req.params.context ?? null
  const { data } = await db.query<SquadInfo>(
    `SELECT id, title, body, on_trainings AS "onTrainings", on_matches AS "onMatches", audience, position
     FROM squad_infos
     WHERE ($1::text IS NULL OR ($1 = 'training' AND on_trainings) OR ($1 = 'match' AND on_matches))
     ORDER BY position, id`,
    [ctx],
  )
  return data
}
