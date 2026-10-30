import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  vs: number
}

export default async function getMatchesVsOpponent(req: { params: Params; user: User }) {
  const { vs } = req.params

  const result = await db.query<{
    id: number
    date: string
    outcome: string
    ourgoals: number
    theirgoals: number
    homeaway: string
    difficulty: string | null
    matchtype: string
    status: string
    league_name: string | null
    cup_name: string | null
  }>(
    `SELECT
      m.id, m.date, m.outcome, m.ourgoals, m.theirgoals, m.homeaway,
      m.difficulty, m.matchtype, m.status,
      l.name AS league_name,
      c.name AS cup_name
    FROM matches m
    LEFT JOIN leagues l ON l.id = m.league
    LEFT JOIN cups c ON c.id = m.cup
    WHERE m.vs = $1
    ORDER BY m.date DESC`,
    [vs]
  )

  return result.data
}
