import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  league: number
  team: number
  m: number
  w: number
  d: number
  l: number
  gm: number
  ga: number
  p: number
}

export default async function upsertStanding(req: { params: Params; user: User }) {
  const { league, team, m, w, d, l, gm, ga, p } = req.params

  // One row per (league, team): update if it exists, otherwise insert.
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM seriesstandings WHERE league = $1 AND team = $2`,
    [league, team]
  )

  if (existing.data.length > 0) {
    const result = await db.query(
      `UPDATE seriesstandings
       SET m = $1, w = $2, d = $3, l = $4, gm = $5, ga = $6, p = $7
       WHERE league = $8 AND team = $9`,
      [m, w, d, l, gm, ga, p, league, team]
    )
    return { updated: result.data }
  }

  const result = await db.query(
    `INSERT INTO seriesstandings (team, m, w, d, l, gm, ga, p, league)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [team, m, w, d, l, gm, ga, p, league]
  )
  return { inserted: result.data }
}
