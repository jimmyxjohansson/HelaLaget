import { db } from '@/server/db'
import { ATTENDED_STATUSES, COUNTED_STATUS, NOW_WALLCLOCK, PAST_TRAINING, withinMonthsOf } from '@/server/attendance'
import { AccessError } from '@/server/access'
import { statsPlayerScope } from '@/server/members-kind'
import type { SquadAccess, User } from '@/server/types'

type Params = {
  playerId: number
  /** Period i månader bakåt (0 = alla). */
  months?: number | null
}

/**
 * Detaljerad statistik för spelarsidan: träningar (med spelarens kommentarer),
 * spelade matcher med mål/assist/räddningar, cuper och medspelare.
 *
 * En match räknas som spelad när spelaren har status Kommer och matchen har
 * ägt rum (avslutad eller starttiden passerad). En cup räknas när spelaren
 * har status Kommer och cupen har börjat.
 */
export default async function getPlayerStats(req: { params: Params; user: User; squad?: SquadAccess }) {
  const playerId = req.params.playerId
  // Spelare och Anhörig ser bara statistik för de kopplade spelarna
  const scope = await statsPlayerScope(req.squad, req.user.id)
  if (scope && !scope.includes(Number(playerId))) throw new AccessError('Statistik visas bara för spelare du är kopplad till.', 403)
  const months = Math.max(0, Math.floor(req.params.months ?? 0))

  const PLAYED = `pm.status::text = 'Kommer' AND pm.leader IS NULL
    AND (m.status::text IN ('Avslutad', 'Registrerad i Fogis') OR m.date <= ${NOW_WALLCLOCK})
    AND ${withinMonthsOf('m.date', '$2')}`

  // Träning med träningsgrupp där spelaren var med (närvarande eller anmäld)
  const IN_GROUP = `pt.player = $1 AND pt.leader IS NULL AND NULLIF(pt."group", '') IS NOT NULL
    AND pt.status::text IN ${ATTENDED_STATUSES}
    AND t.date < (((now() AT TIME ZONE 'Europe/Stockholm')::date + 1)::timestamp AT TIME ZONE 'UTC')
    AND ${withinMonthsOf('t.date', '$2')}`

  const [trainings, matches, cups, teammates, groupmates] = await Promise.all([
    db.query<{
      id: number
      date: string
      type: string
      indooroutdoor: string | null
      status: string | null
      reason: string | null
      reasontime: string | null
      group: string | null
      counted: boolean
      attended: boolean
    }>(
      `SELECT t.id, t.date, t.type::text AS type, t.indooroutdoor::text AS indooroutdoor,
              pt.status::text AS status, NULLIF(trim(pt.reason), '') AS reason, pt.reasontime,
              NULLIF(pt."group", '') AS "group",
              (${PAST_TRAINING} AND ${COUNTED_STATUS}) AS counted,
              COALESCE(pt.status::text IN ${ATTENDED_STATUSES}, false) AS attended
       FROM participantstrainings pt
       JOIN trainings t ON t.id = pt.training
       WHERE pt.player = $1 AND pt.leader IS NULL
         AND t.date < (((now() AT TIME ZONE 'Europe/Stockholm')::date + 1)::timestamp AT TIME ZONE 'UTC')
         AND ${withinMonthsOf('t.date', '$2')}
       ORDER BY t.date DESC`,
      [playerId, months],
    ),
    db.query<{
      id: number
      date: string
      matchtype: string | null
      difficulty: string | null
      homeaway: string | null
      opponent: string | null
      opponent_logo: string | null
      ourgoals: number
      theirgoals: number
      cup_id: number | null
      cup_name: string | null
      position: string | null
      goals: number
      assists: number
      saves: number
      goalkeeper: boolean
    }>(
      `SELECT m.id, m.date, m.matchtype::text AS matchtype, NULLIF(m.difficulty::text, '') AS difficulty,
              m.homeaway::text AS homeaway, COALESCE(NULLIF(t.team, ''), NULLIF(m.teamname, '')) AS opponent,
              NULLIF(t.imgurl, '') AS opponent_logo,
              COALESCE(m.ourgoals, 0)::int AS ourgoals, COALESCE(m.theirgoals, 0)::int AS theirgoals,
              c.id AS cup_id, c.name AS cup_name, NULLIF(pm.position, '') AS position,
              (SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.goal = $1)::int AS goals,
              (SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.assist = $1)::int AS assists,
              (SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.save = $1)::int AS saves,
              (pm.position = 'Målvakt' OR m.goalkeeper = $1) AS goalkeeper
       FROM participantsmatches pm
       JOIN matches m ON m.id = pm.match
       LEFT JOIN teams t ON t.id = m.vs
       LEFT JOIN cups c ON c.id = m.cup
       WHERE pm.player = $1 AND ${PLAYED}
       ORDER BY m.date DESC, m.id DESC`,
      [playerId, months],
    ),
    db.query<{
      id: number
      name: string
      startdate: string | null
      enddate: string | null
      location: string | null
      difficulty: string | null
      matches: number
      goals: number
      assists: number
      saves: number
    }>(
      `SELECT c.id, c.name, c.startdate::text AS startdate, c.enddate::text AS enddate, c.location,
              NULLIF(c.difficulty::text, '') AS difficulty,
              (SELECT COUNT(*) FROM matches mm JOIN participantsmatches pm ON pm.match = mm.id
                WHERE mm.cup = c.id AND pm.player = $1 AND pm.status::text = 'Kommer')::int AS matches,
              (SELECT COUNT(*) FROM matchgoalsassists e JOIN matches mm ON mm.id = e.match
                WHERE mm.cup = c.id AND e.goal = $1)::int AS goals,
              (SELECT COUNT(*) FROM matchgoalsassists e JOIN matches mm ON mm.id = e.match
                WHERE mm.cup = c.id AND e.assist = $1)::int AS assists,
              (SELECT COUNT(*) FROM matchgoalsassists e JOIN matches mm ON mm.id = e.match
                WHERE mm.cup = c.id AND e.save = $1)::int AS saves
       FROM participantscups pc
       JOIN cups c ON c.id = pc.cup
       WHERE pc.player = $1 AND pc.leader IS NULL AND pc.status::text = 'Kommer'
         AND (c.startdate IS NULL OR c.startdate <= (now() AT TIME ZONE 'Europe/Stockholm')::date)
         AND ($2::int = 0 OR c.startdate >= (now() AT TIME ZONE 'Europe/Stockholm')::date - make_interval(months => $2::int))
       ORDER BY c.startdate DESC NULLS LAST, c.id DESC`,
      [playerId, months],
    ),
    db.query<{
      id: number
      shortname: string | null
      firstname: string | null
      lastname: string | null
      img: string | null
      rank: string | null
      status: string | null
      matches: number
    }>(
      `SELECT p.id, p.shortname, p.firstname, p.lastname, p.img, p.rank::text AS rank, p.status::text AS status,
              COUNT(DISTINCT m.id)::int AS matches
       FROM participantsmatches pm
       JOIN matches m ON m.id = pm.match
       JOIN participantsmatches o ON o.match = m.id AND o.player IS NOT NULL AND o.player <> $1
         AND o.leader IS NULL AND o.status::text = 'Kommer'
       JOIN players p ON p.id = o.player
       WHERE pm.player = $1 AND ${PLAYED}
       GROUP BY p.id
       ORDER BY matches DESC, p.shortname`,
      [playerId, months],
    ),
    // Spelare i samma träningsgrupp på samma träning
    db.query<{
      id: number
      shortname: string | null
      firstname: string | null
      lastname: string | null
      img: string | null
      rank: string | null
      status: string | null
      trainings: number
    }>(
      `SELECT p.id, p.shortname, p.firstname, p.lastname, p.img, p.rank::text AS rank, p.status::text AS status,
              COUNT(DISTINCT t.id)::int AS trainings
       FROM participantstrainings pt
       JOIN trainings t ON t.id = pt.training
       JOIN participantstrainings o ON o.training = t.id AND o.player IS NOT NULL AND o.player <> $1
         AND o.leader IS NULL AND o."group" = pt."group" AND o.status::text IN ${ATTENDED_STATUSES}
       JOIN players p ON p.id = o.player
       WHERE ${IN_GROUP}
       GROUP BY p.id
       ORDER BY trainings DESC, p.shortname`,
      [playerId, months],
    ),
  ])
  const groupTrainings = await db.query<{ n: number }>(
    `SELECT COUNT(DISTINCT t.id)::int AS n FROM participantstrainings pt JOIN trainings t ON t.id = pt.training WHERE ${IN_GROUP}`,
    [playerId, months],
  )

  return {
    trainings: trainings.data,
    matches: matches.data,
    cups: cups.data,
    teammates: teammates.data,
    groupmates: groupmates.data,
    /** Träningar där spelaren var med i en träningsgrupp */
    groupTrainings: groupTrainings.data[0]?.n ?? 0,
  }
}
