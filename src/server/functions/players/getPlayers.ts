import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  months?: number | null
}

export default async function getPlayers(req: { params: Params; user: User }) {
  // 0 means "all time"; positive integer means filter to last N months
  const months = req.params.months ?? 0

  const result = await db.query<{
    id: number
    firstname: string
    lastname: string
    shortname: string
    number: number
    img: string
    status: string
    rank: string | null
    defender: boolean
    defensivemidfielder: boolean
    offensivemidfielder: boolean
    winger: boolean
    striker: boolean
    goalkeeper: boolean
    sessions_attended: string
    total_sessions: string
  }>(
    `SELECT
      p.id, p.firstname, p.lastname, p.shortname, p.number, p.img, p.status, p.rank,
      p.defender, p.defensivemidfielder, p.offensivemidfielder, p.winger, p.striker, p.goalkeeper,
      COUNT(CASE WHEN pt.status::text IN ('Närvarande', 'Anmäld', 'Annan aktivitet') AND t.id IS NOT NULL THEN 1 END) AS sessions_attended,
      COUNT(t.id) AS total_sessions
    FROM players p
    LEFT JOIN participantstrainings pt ON pt.player = p.id
    LEFT JOIN trainings t ON t.id = pt.training
      AND t.type::text = 'Träning'
      AND ($1::int = 0 OR t.date >= NOW() - make_interval(months => $2::int))
    WHERE EXISTS (SELECT 1 FROM squad_players sp WHERE sp.player_id = p.id AND sp.squad_id = app.squad_id())
    GROUP BY p.id
    ORDER BY p.shortname`,
    [months, months]
  )
  return result.data
}
