import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  cupId: number
}

export default async function getCupParticipants(req: { params: Params; user: User }) {
  const { cupId } = req.params

  const cupResult = await db.query<{
    id: number
    name: string
  }>(
    `SELECT id, name FROM cups WHERE id = $1`,
    [cupId]
  )

  const participantsResult = await db.query<{
    id: number
    player: number | null
    status: string
    position: string | null
    reason: string | null
    shortname: string | null
    firstname: string | null
    lastname: string | null
    img: string | null
    number: number | null
    rank: string | null
  }>(
    `SELECT
      pc.id, pc.player, pc.status, pc.position, pc.reason,
      p.shortname, p.firstname, p.lastname, p.img, p.number, p.rank
    FROM participantscups pc
    LEFT JOIN players p ON p.id = pc.player
    WHERE pc.cup = $1 AND pc.leader IS NULL
    ORDER BY pc.status, p.shortname`,
    [cupId]
  )

  return {
    cup: cupResult.data[0] ?? null,
    participants: participantsResult.data,
  }
}
