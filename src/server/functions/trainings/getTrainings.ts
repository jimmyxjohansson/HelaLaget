import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  limit?: number
  /** Valfritt intervall (ISO). Utan intervall: de senaste efter datum, som tidigare. */
  from?: string | null
  to?: string | null
}

export default async function getTrainings(req: { params: Params; user: User }) {
  const limit = req.params.limit ?? 50
  const { from = null, to = null } = req.params
  const result = await db.query<{
    id: number
    type: string
    date1: string
    date: string
    indooroutdoor: string
    notes: string | null
    svenskalag: string | null
    reported: boolean
    present_count: string
    absent_count: string
    total_registered: string
    // Player counts by status
    p_narvarande: string
    p_anmald: string
    p_kallad: string
    p_ej: string
    // Leader counts by status
    l_narvarande: string
    l_anmald: string
    l_kallad: string
    l_ej: string
  }>(
    `SELECT
      t.id, t.type, t.date1, t.date, t.indooroutdoor, t.notes, t.svenskalag, t.reported,
      COUNT(CASE WHEN pt.status::text = 'Närvarande' THEN 1 END) AS present_count,
      COUNT(CASE WHEN pt.status::text = 'Ej närvarande' THEN 1 END) AS absent_count,
      COUNT(pt.id) AS total_registered,
      COUNT(CASE WHEN pt.player IS NOT NULL AND pt.status::text = 'Närvarande'                                                        THEN 1 END) AS p_narvarande,
      COUNT(CASE WHEN pt.player IS NOT NULL AND pt.status::text = 'Anmäld'                                                            THEN 1 END) AS p_anmald,
      COUNT(CASE WHEN pt.player IS NOT NULL AND pt.status::text = 'Kallad'                                                            THEN 1 END) AS p_kallad,
      COUNT(CASE WHEN pt.player IS NOT NULL AND pt.status::text IN ('Ej närvarande','Anmäld, kom ej','Annan aktivitet')               THEN 1 END) AS p_ej,
      COUNT(CASE WHEN pt.leader IS NOT NULL AND pt.status::text = 'Närvarande'                                                        THEN 1 END) AS l_narvarande,
      COUNT(CASE WHEN pt.leader IS NOT NULL AND pt.status::text = 'Anmäld'                                                            THEN 1 END) AS l_anmald,
      COUNT(CASE WHEN pt.leader IS NOT NULL AND pt.status::text = 'Kallad'                                                            THEN 1 END) AS l_kallad,
      COUNT(CASE WHEN pt.leader IS NOT NULL AND pt.status::text IN ('Ej närvarande','Anmäld, kom ej','Annan aktivitet')               THEN 1 END) AS l_ej
    FROM trainings t
    LEFT JOIN participantstrainings pt ON pt.training = t.id
    WHERE ($2::timestamptz IS NULL OR t.date >= $2::timestamptz)
      AND ($3::timestamptz IS NULL OR t.date < $3::timestamptz)
    GROUP BY t.id
    ORDER BY t.date DESC
    LIMIT $1`,
    [limit, from, to]
  )
  return result.data
}
