import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
}

export default async function getCupAttendees(req: { params: Params; user: User }) {
  const id = req.params.id

  const res = await db.query<{
    id: number
    number: number | null
    firstname: string | null
    lastname: string | null
    birthdate: string | null
  }>(
    `SELECT DISTINCT p.id, p.number, p.firstname, p.lastname,
      to_char(p.birthdate, 'YYYY-MM-DD') AS birthdate
    FROM participantsmatches pm
    JOIN players p ON p.id = pm.player
    WHERE pm.match IN (SELECT id FROM matches WHERE cup = $1)
      AND pm.leader IS NULL
      AND pm.status = 'Kommer'
    ORDER BY p.lastname`,
    [id]
  )

  return res.data
}
