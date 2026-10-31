import { db } from '@/server/db'
import { PLAYED_MATCH, betweenDatesOf } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  from?: string | null
  to?: string | null
}

/**
 * Spelade matcher per spelare, matchtyp och nivå, med mål, assist och
 * räddningar. Filtrering och summering görs i appen.
 */
export default async function getStatsMatches(req: { params: Params; user: User }) {
  const from = req.params.from || null
  const to = req.params.to || null

  const [rows, people, held] = await Promise.all([
    db.query<{ id: number; matchtype: string; level: string; matches: number; goalkeeper: number; goals: number; assists: number; saves: number }>(
      `SELECT pm.player AS id, COALESCE(m.matchtype::text, 'Övrigt') AS matchtype,
              COALESCE(NULLIF(m.difficulty::text, ''), '–') AS level,
              COUNT(DISTINCT m.id)::int AS matches,
              COUNT(DISTINCT m.id) FILTER (WHERE pm.position = 'Målvakt' OR m.goalkeeper = pm.player)::int AS goalkeeper,
              COALESCE(SUM((SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.goal = pm.player)), 0)::int AS goals,
              COALESCE(SUM((SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.assist = pm.player)), 0)::int AS assists,
              COALESCE(SUM((SELECT COUNT(*) FROM matchgoalsassists e WHERE e.match = m.id AND e.save = pm.player)), 0)::int AS saves
       FROM participantsmatches pm
       JOIN matches m ON m.id = pm.match
       WHERE ${PLAYED_MATCH} AND ${betweenDatesOf('m.date', '$1', '$2')}
       GROUP BY 1, 2, 3`,
      [from, to],
    ),
    db.query<{ id: number; shortname: string | null; name: string; rank: string | null; status: string | null; member: boolean }>(
      `SELECT p.id, p.shortname, trim(concat_ws(' ', p.firstname, p.lastname)) AS name, p.rank::text AS rank, p.status::text AS status,
              EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id()) AS member
       FROM players p
       WHERE EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id())
          OR EXISTS (SELECT 1 FROM participantsmatches pm JOIN matches m ON m.id = pm.match
                     WHERE pm.player = p.id AND ${PLAYED_MATCH} AND ${betweenDatesOf('m.date', '$1', '$2')})`,
      [from, to],
    ),
    // Lagets spelade matcher, för att visa hur stor andel spelaren varit med i
    db.query<{ matchtype: string; level: string; n: number }>(
      `SELECT COALESCE(m.matchtype::text, 'Övrigt') AS matchtype, COALESCE(NULLIF(m.difficulty::text, ''), '–') AS level, COUNT(*)::int AS n
       FROM matches m
       WHERE (m.status::text IN ('Avslutad', 'Registrerad i Fogis') OR m.date <= ((now() AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'UTC'))
         AND ${betweenDatesOf('m.date', '$1', '$2')}
         AND EXISTS (SELECT 1 FROM participantsmatches pm WHERE pm.match = m.id AND pm.status::text = 'Kommer' AND pm.leader IS NULL AND pm.player IS NOT NULL)
       GROUP BY 1, 2`,
      [from, to],
    ),
  ])
  return { rows: rows.data, people: people.data, held: held.data }
}
