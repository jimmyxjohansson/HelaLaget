import { db } from '@/server/db'
import { betweenDatesOf } from '@/server/attendance'
import type { User } from '@/server/types'

type Params = {
  /** ÅÅÅÅ-MM-DD eller null (alla) */
  from?: string | null
  /** ÅÅÅÅ-MM-DD eller null (i dag) */
  to?: string | null
}

/**
 * Träningsnärvaro för lagets spelare och ledare: antal rader per person,
 * träningstyp och status för genomförda träningar i perioden. Summering och
 * filtrering på typ görs i appen.
 */
export default async function getStatsTrainings(req: { params: Params; user: User }) {
  const from = req.params.from || null
  const to = req.params.to || null

  const [rows, people, held] = await Promise.all([
    db.query<{ kind: 'player' | 'leader'; id: number; type: string; status: string; n: number }>(
      `SELECT CASE WHEN pt.leader IS NOT NULL THEN 'leader' ELSE 'player' END AS kind,
              COALESCE(pt.leader, pt.player) AS id, t.type::text AS type,
              COALESCE(pt.status::text, 'Ingen status') AS status, COUNT(*)::int AS n
       FROM participantstrainings pt
       JOIN trainings t ON t.id = pt.training
       WHERE (pt.player IS NOT NULL OR pt.leader IS NOT NULL)
         AND ${betweenDatesOf('t.date', '$1', '$2')}
       GROUP BY 1, 2, 3, 4`,
      [from, to],
    ),
    db.query<{ kind: 'player' | 'leader'; id: number; shortname: string | null; name: string; rank: string | null; status: string | null; member: boolean }>(
      `SELECT 'player' AS kind, p.id, p.shortname, trim(concat_ws(' ', p.firstname, p.lastname)) AS name,
              p.rank::text AS rank, p.status::text AS status,
              EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id()) AS member
       FROM players p
       WHERE EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id())
          OR EXISTS (SELECT 1 FROM participantstrainings pt JOIN trainings t ON t.id = pt.training
                     WHERE pt.player = p.id AND ${betweenDatesOf('t.date', '$1', '$2')})
       UNION ALL
       SELECT 'leader', l.id, l.shortname, trim(concat_ws(' ', l.firstname, l.lastname)), NULL,
              CASE WHEN l.active THEN 'Aktiv' ELSE 'Inaktiv' END,
              EXISTS (SELECT 1 FROM squad_leaders sl WHERE sl.leader_id = l.id AND sl.squad_id = app.squad_id())
       FROM leaders l
       WHERE EXISTS (SELECT 1 FROM squad_leaders sl WHERE sl.leader_id = l.id AND sl.squad_id = app.squad_id())
          OR EXISTS (SELECT 1 FROM participantstrainings pt JOIN trainings t ON t.id = pt.training
                     WHERE pt.leader = l.id AND ${betweenDatesOf('t.date', '$1', '$2')})`,
      [from, to],
    ),
    db.query<{ type: string; n: number }>(
      `SELECT t.type::text AS type, COUNT(*)::int AS n FROM trainings t
       WHERE ${betweenDatesOf('t.date', '$1', '$2')} GROUP BY 1`,
      [from, to],
    ),
  ])
  return { rows: rows.data, people: people.data, held: held.data }
}
