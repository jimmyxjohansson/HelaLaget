import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = Record<string, never>

export default async function getStats(_req: { params: Params; user: User }) {
  const overallRes = await db.query<{
    total_trainings: string
    total_present: string
    avg_attendance: string
  }>(
    `SELECT
      COUNT(DISTINCT t.id) AS total_trainings,
      COUNT(CASE WHEN pt.status::text = 'Närvarande' THEN 1 END) AS total_present,
      ROUND(
        AVG(sub.present_count), 1
      ) AS avg_attendance
    FROM trainings t
    LEFT JOIN participantstrainings pt ON pt.training = t.id
    LEFT JOIN (
      SELECT training, COUNT(*) AS present_count
      FROM participantstrainings
      WHERE status::text = 'Närvarande'
      GROUP BY training
    ) sub ON sub.training = t.id`
  )

  const byTypeRes = await db.query<{
    type: string
    count: string
    avg_present: string
  }>(
    `SELECT
      t.type,
      COUNT(DISTINCT t.id) AS count,
      ROUND(AVG(sub.present_count), 1) AS avg_present
    FROM trainings t
    LEFT JOIN (
      SELECT training, COUNT(*) AS present_count
      FROM participantstrainings
      WHERE status::text = 'Närvarande'
      GROUP BY training
    ) sub ON sub.training = t.id
    GROUP BY t.type
    ORDER BY count DESC`
  )

  const monthlyRes = await db.query<{
    month: string
    count: string
    avg_present: string
  }>(
    `SELECT
      TO_CHAR(t.date, 'Mon YYYY') AS month,
      COUNT(DISTINCT t.id) AS count,
      ROUND(AVG(sub.present_count), 1) AS avg_present
    FROM trainings t
    LEFT JOIN (
      SELECT training, COUNT(*) AS present_count
      FROM participantstrainings
      WHERE status::text = 'Närvarande'
      GROUP BY training
    ) sub ON sub.training = t.id
    WHERE t.date >= NOW() - INTERVAL '6 months'
    GROUP BY TO_CHAR(t.date, 'Mon YYYY'), DATE_TRUNC('month', t.date)
    ORDER BY DATE_TRUNC('month', t.date)`
  )

  return {
    overall: overallRes.data[0] ?? null,
    byType: byTypeRes.data,
    monthly: monthlyRes.data,
  }
}
