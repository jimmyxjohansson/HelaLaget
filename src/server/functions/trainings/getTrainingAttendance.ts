import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  // ISO date strings (inclusive-ish range). Upper bound is extended by 14 days to match the original report.
  date1: string
  date2: string
  // Player statuses to include. Empty/omitted → default set.
  statuses?: string[]
}

const DEFAULT_STATUSES = ['Aktiv', 'Provspelare', 'Gästspelare', 'Vilande', 'Slutat']

export default async function getTrainingAttendance(req: { params: Params; user: User }) {
  const { date1, date2 } = req.params
  const statuses = req.params.statuses && req.params.statuses.length > 0
    ? req.params.statuses
    : DEFAULT_STATUSES

  const result = await db.query<{
    id: number
    shortname: string | null
    rank: string | null
    coming: string
    total: string
    percent: string | null
  }>(
    `SELECT
      p.id,
      p.shortname,
      p.rank,
      COUNT(CASE WHEN pt.status::text IN ('Närvarande', 'Närvarande, ej hela', 'Anmäld', 'Annan aktivitet') AND t.type::text = 'Träning' THEN pt.player END) AS coming,
      COUNT(CASE WHEN t.type::text = 'Träning' THEN pt.player END) AS total,
      CAST(COUNT(CASE WHEN pt.status::text IN ('Närvarande', 'Närvarande, ej hela', 'Anmäld', 'Annan aktivitet') AND t.type::text = 'Träning' THEN pt.player END) AS decimal)
        / NULLIF(CAST(COUNT(CASE WHEN t.type::text = 'Träning' THEN pt.player END) AS decimal), 0) AS percent
    FROM participantstrainings pt
    LEFT JOIN players p ON pt.player = p.id
    LEFT JOIN trainings t ON pt.training = t.id
    WHERE
      t.date > $1::timestamptz
      AND t.date < ($2::timestamptz + interval '14 days')
      AND p.status::text = ANY($3::text[])
    GROUP BY p.id
    ORDER BY p.rank ASC, percent DESC NULLS LAST`,
    [date1, date2, statuses]
  )

  return result.data.map(r => ({
    id: r.id,
    shortname: r.shortname,
    rank: r.rank,
    coming: Number(r.coming),
    total: Number(r.total),
    percent: r.percent != null ? Number(r.percent) : null,
  }))
}
