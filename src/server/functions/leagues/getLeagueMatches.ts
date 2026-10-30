import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
}

export default async function getLeagueMatches(req: { params: Params; user: User }) {
  const { id } = req.params

  const leagueResult = await db.query<{ id: number; name: string; status: string }>(
    `SELECT id, name, status FROM leagues WHERE id = $1`,
    [id]
  )

  const matchesResult = await db.query<{
    id: number
    date: string
    homeaway: string
    ourgoals: number
    theirgoals: number
    outcome: string
    status: string
    location: string | null
    difficulty: string | null
    opponent: string | null
    opponent_img: string | null
    teamname: string | null
  }>(
    `SELECT
      m.id, m.date, m.homeaway, m.ourgoals, m.theirgoals, m.outcome,
      m.status, m.location, m.difficulty, m.teamname,
      t.team AS opponent,
      t.imgurl AS opponent_img
    FROM matches m
    LEFT JOIN teams t ON t.id = m.vs
    WHERE m.league = $1
    ORDER BY m.date DESC`,
    [id]
  )

  const standingsResult = await db.query<{
    team: number
    team_name: string | null
    imgurl: string | null
    m: number
    w: number
    d: number
    l: number
    gm: number
    ga: number
    p: number
  }>(
    `SELECT
      s.team, s.m, s.w, s.d, s.l, s.gm, s.ga, s.p,
      t.team AS team_name,
      t.imgurl
    FROM seriesstandings s
    LEFT JOIN teams t ON t.id = s.team
    WHERE s.league = $1
    ORDER BY s.p DESC, (s.gm - s.ga) DESC, s.gm DESC, t.team`,
    [id]
  )

  const participantsResult = await db.query<{
    id: number
    shortname: string | null
    firstname: string | null
    lastname: string | null
    img: string | null
    number: number | null
    matches_played: number
  }>(
    `SELECT p.id, p.shortname, p.firstname, p.lastname, p.img, p.number,
      COUNT(DISTINCT pm.match) AS matches_played
    FROM participantsmatches pm
    JOIN players p ON p.id = pm.player
    WHERE pm.match IN (SELECT id FROM matches WHERE league = $1)
      AND pm.leader IS NULL
      AND pm.status = 'Kommer'
    GROUP BY p.id
    ORDER BY p.shortname`,
    [id]
  )

  const statsResult = await db.query<{
    player: number
    goals: number
    assists: number
    saves: number
  }>(
    `SELECT player, SUM(goals) AS goals, SUM(assists) AS assists, SUM(saves) AS saves
    FROM (
      SELECT goal AS player, 1 AS goals, 0 AS assists, 0 AS saves
        FROM matchgoalsassists WHERE match IN (SELECT id FROM matches WHERE league = $1) AND goal IS NOT NULL
      UNION ALL
      SELECT assist AS player, 0 AS goals, 1 AS assists, 0 AS saves
        FROM matchgoalsassists WHERE match IN (SELECT id FROM matches WHERE league = $2) AND assist IS NOT NULL
      UNION ALL
      SELECT save AS player, 0 AS goals, 0 AS assists, 1 AS saves
        FROM matchgoalsassists WHERE match IN (SELECT id FROM matches WHERE league = $3) AND save IS NOT NULL
    ) sub
    GROUP BY player`,
    [id, id, id]
  )

  const statsMap = new Map<number, { goals: number; assists: number; saves: number }>()
  for (const row of statsResult.data) {
    statsMap.set(row.player, {
      goals: Number(row.goals),
      assists: Number(row.assists),
      saves: Number(row.saves),
    })
  }

  const participants = participantsResult.data.map(p => ({
    ...p,
    matches_played: Number(p.matches_played),
    goals: statsMap.get(p.id)?.goals ?? 0,
    assists: statsMap.get(p.id)?.assists ?? 0,
    saves: statsMap.get(p.id)?.saves ?? 0,
  }))

  return {
    league: leagueResult.data[0] ?? null,
    matches: matchesResult.data,
    standings: standingsResult.data,
    participants,
  }
}
