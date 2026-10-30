import { db } from '@/server/db'
import type { User } from '@/server/types'

interface Params {
  team: string
  imgurl?: string | null
  country?: string | null
}

export default async function createTeam(req: { params: Params; user: User }) {
  const team = req.params.team?.trim()
  if (!team) {
    throw new Error('Lagnamn krävs.')
  }

  const result = await db.query<{ id: number; team: string; imgurl: string | null; country: string | null }>(
    `INSERT INTO teams (team, imgurl, country) VALUES ($1, $2, $3) RETURNING id, team, imgurl, country`,
    [team, req.params.imgurl?.trim() || null, req.params.country?.trim() || null],
  )

  return result.data[0]
}
