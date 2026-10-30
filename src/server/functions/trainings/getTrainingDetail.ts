import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
}

export default async function getTrainingDetail(req: { params: Params; user: User }) {
  const { trainingId } = req.params

  const trainingRes = await db.query<{
    id: number
    type: string
    date1: string
    date: string
    indooroutdoor: string
    notes: string | null
    svenskalag: string | null
    reported: boolean
    present_count: string
    total_registered: string
  }>(
    `SELECT
      t.id, t.type, t.date1, t.date, t.indooroutdoor, t.notes, t.svenskalag, t.reported,
      COUNT(CASE WHEN pt.status::text = 'Närvarande' AND pt.player IS NOT NULL THEN 1 END) AS present_count,
      COUNT(CASE WHEN pt.player IS NOT NULL THEN 1 END) AS total_registered
    FROM trainings t
    LEFT JOIN participantstrainings pt ON pt.training = t.id
    WHERE t.id = $1
    GROUP BY t.id`,
    [trainingId]
  )

  const attendeesRes = await db.query<{
    player_id: number
    firstname: string
    lastname: string
    shortname: string
    number: number
    img: string
    status: string
    reason: string | null
    reasontime: string | null
    group_name: string | null
    comment: string | null
  }>(
    `SELECT
      p.id AS player_id, p.firstname, p.lastname, p.shortname, p.number, p.img, p.comment,
      pt.status::text AS status, pt.reason, pt.reasontime, pt.group AS group_name
    FROM participantstrainings pt
    JOIN players p ON p.id = pt.player
    WHERE pt.training = $1
    ORDER BY pt.status::text, p.shortname`,
    [trainingId]
  )

  const leadersRes = await db.query<{
    leader_id: number
    shortname: string
    firstname: string
    lastname: string
    status: string
    reason: string | null
    reasontime: string | null
  }>(
    `SELECT
      l.id AS leader_id, l.shortname, l.firstname, l.lastname,
      pt.status::text AS status, pt.reason, pt.reasontime
    FROM participantstrainings pt
    JOIN leaders l ON l.id = pt.leader
    WHERE pt.training = $1
    ORDER BY pt.status::text, l.shortname`,
    [trainingId]
  )

  return {
    training: trainingRes.data[0] ?? null,
    attendees: attendeesRes.data,
    leaders: leadersRes.data,
  }
}
