import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
  playerIds: number[]
  group: string | null
  grouprank?: string | null
}

export default async function updateParticipantGroups(req: { params: Params; user: User }) {
  const { trainingId, playerIds, group, grouprank } = req.params

  if (!playerIds.length) return { updated: 0 }

  if (grouprank !== undefined) {
    const result = await db.query(
      `UPDATE participantstrainings
       SET "group" = $1,
           grouprank = $2
       WHERE training = $3
         AND player = ANY($4::int[])`,
      [group, grouprank, trainingId, playerIds]
    )
    return { updated: result.data }
  }

  const result = await db.query(
    `UPDATE participantstrainings
     SET "group" = $1
     WHERE training = $2
       AND player = ANY($3::int[])`,
    [group, trainingId, playerIds]
  )

  return { updated: result.data }
}
