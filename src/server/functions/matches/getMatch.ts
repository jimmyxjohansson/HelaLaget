import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
}

export default async function getMatch(req: { params: Params; user: User }) {
  const id = req.params.id

  const matchResult = await db.query<{
    id: number
    matchtype: string
    date: string
    homeaway: string
    ourgoals: number
    theirgoals: number
    matchplayers: string | null
    indooroutdoor: string
    outcome: string
    status: string
    location: string | null
    notes: string | null
    teamname: string | null
    league_name: string | null
    cup: number | null
    cupphase: string | null
    opponent: string | null
    opponent_img: string | null
    cup_name: string | null
    difficulty: string | null
    playtime: number | null
    periods: number | null
    fogislink: string | null
    fogisno: string | null
    fogisregistered: boolean | null
    svenskalag: string | null
    goalkeeper: number | null
    vs: number | null
    league: number | null
    clock_started_at: string | null
    clock_period: number | null
    clock_offset_minutes: number | null
    clock_period_start_minutes: number | null
    server_now: string
    mute_notifications: boolean
  }>(
    `SELECT
      m.id, m.matchtype, m.date, m.homeaway, m.ourgoals, m.theirgoals,
      m.matchplayers, m.indooroutdoor, m.outcome, m.status, m.location,
      m.notes, m.teamname, m.cup, m.cupphase, m.difficulty, m.playtime, m.periods,
      m.fogislink, m.fogisno, m.fogisregistered, m.svenskalag, m.vs, m.league, m.goalkeeper,
      m.clock_started_at, m.clock_period, m.clock_offset_minutes, m.clock_period_start_minutes, now() AS server_now,
      COALESCE(m.mute_notifications, false) AS mute_notifications,
      t.team AS opponent,
      t.imgurl AS opponent_img,
      l.name AS league_name,
      c.name AS cup_name
    FROM matches m
    LEFT JOIN teams t ON t.id = m.vs
    LEFT JOIN leagues l ON l.id = m.league
    LEFT JOIN cups c ON c.id = m.cup
    WHERE m.id = $1`,
    [id]
  )

  const participantsResult = await db.query<{
    id: number
    player: number | null
    goals: number
    assists: number
    saves: number
    status: string
    position: string | null
    reason: string | null
    shortname: string | null
    firstname: string | null
    lastname: string | null
    img: string | null
    number: number | null
    rank: string | null
  }>(
    `SELECT
      pm.id, pm.player, pm.goals, pm.assists, COALESCE(pm.goalkeeper, 0) AS saves, pm.status, pm.position, pm.reason,
      p.shortname, p.firstname, p.lastname, p.img, p.number, p.rank
    FROM participantsmatches pm
    LEFT JOIN players p ON p.id = pm.player
    WHERE pm.match = $1 AND pm.leader IS NULL
    ORDER BY pm.status, p.shortname`,
    [id]
  )

  const goalsAssistsResult = await db.query<{
    player: number
    goals: number
    assists: number
    saves: number
  }>(
    `SELECT player, SUM(goals) AS goals, SUM(assists) AS assists, SUM(saves) AS saves
    FROM (
      SELECT goal AS player, 1 AS goals, 0 AS assists, 0 AS saves
        FROM matchgoalsassists WHERE match = $1 AND goal IS NOT NULL
      UNION ALL
      SELECT assist AS player, 0 AS goals, 1 AS assists, 0 AS saves
        FROM matchgoalsassists WHERE match = $2 AND assist IS NOT NULL
      UNION ALL
      SELECT save AS player, 0 AS goals, 0 AS assists, 1 AS saves
        FROM matchgoalsassists WHERE match = $3 AND save IS NOT NULL
    ) sub
    GROUP BY player`,
    [id, id, id]
  )

  // Build a lookup map: player id -> { goals, assists, saves }
  const statsMap = new Map<number, { goals: number; assists: number; saves: number }>()
  for (const row of goalsAssistsResult.data) {
    statsMap.set(row.player, { goals: Number(row.goals), assists: Number(row.assists), saves: Number(row.saves) })
  }

  // Merge stats into participants
  const participants = participantsResult.data.map(p => ({
    ...p,
    goals: p.player != null ? (statsMap.get(p.player)?.goals ?? 0) : 0,
    assists: p.player != null ? (statsMap.get(p.player)?.assists ?? 0) : 0,
    saves: p.player != null ? (statsMap.get(p.player)?.saves ?? 0) : 0,
  }))

  const eventsResult = await db.query<{
    id: number
    goal: number | null
    assist: number | null
    save: number | null
    minute: number | null
    period: number | null
    ourgoal: number
    theirgoal: number
    type: string | null
    goal_name: string | null
    assist_name: string | null
    save_name: string | null
  }>(
    `SELECT mga.id, mga.goal, mga.assist, mga.save, mga.minute, mga.period,
      mga.ourgoal, mga.theirgoal, mga.type,
      pg.shortname AS goal_name,
      pa.shortname AS assist_name,
      ps.shortname AS save_name
    FROM matchgoalsassists mga
    LEFT JOIN players pg ON pg.id = mga.goal
    LEFT JOIN players pa ON pa.id = mga.assist
    LEFT JOIN players ps ON ps.id = mga.save
    WHERE mga.match = $1
    ORDER BY COALESCE(mga.period, 1), mga.minute ASC NULLS LAST, mga.id ASC`,
    [id]
  )

  // Gula och röda kort (egen tabell, påverkar inte resultatet)
  const cardsResult = await db.query<{
    id: number
    player: number | null
    side: 'our' | 'their'
    color: 'Gul' | 'Röd'
    minute: number | null
    period: number | null
    player_name: string | null
  }>(
    `SELECT c.id, c.player, c.side, c.color, c.minute, c.period, p.shortname AS player_name
     FROM matchcards c
     LEFT JOIN players p ON p.id = c.player
     WHERE c.match = $1
     ORDER BY COALESCE(c.period, 1), c.minute ASC NULLS LAST, c.id ASC`,
    [id]
  )

  return {
    match: matchResult.data[0] ?? null,
    participants,
    events: eventsResult.data,
    cards: cardsResult.data,
  }
}
