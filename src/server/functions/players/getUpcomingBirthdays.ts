import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  days?: number
}

export default async function getUpcomingBirthdays(req: { params: Params; user: User }) {
  const days = req.params.days ?? 14

  const result = await db.query<{
    id: number
    firstname: string
    lastname: string
    shortname: string | null
    img: string | null
    number: number | null
    birthdate: string
    next_birthday: string
    turning_age: number
    days_until: number
  }>(
    `WITH b AS (
      SELECT
        id, firstname, lastname, shortname, img, number, birthdate,
        (
          make_date(
            EXTRACT(YEAR FROM CURRENT_DATE)::int
              + CASE
                  WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                 EXTRACT(MONTH FROM birthdate)::int,
                                 EXTRACT(DAY FROM birthdate)::int) < CURRENT_DATE
                  THEN 1 ELSE 0 END,
            EXTRACT(MONTH FROM birthdate)::int,
            EXTRACT(DAY FROM birthdate)::int
          )
        ) AS next_birthday
      FROM players
      WHERE active = true AND status != 'Slutat' AND birthdate IS NOT NULL
    )
    SELECT
      id, firstname, lastname, shortname, img, number, birthdate, next_birthday,
      (EXTRACT(YEAR FROM age(next_birthday, birthdate)))::int AS turning_age,
      (next_birthday - CURRENT_DATE)::int AS days_until
    FROM b
    WHERE next_birthday BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int)
    ORDER BY next_birthday ASC`,
    [days]
  )

  return result.data
}
