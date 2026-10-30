import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  trainingId: number
}

export default async function deleteTraining(req: { params: Params; user: User }) {
  const { trainingId } = req.params

  // Delete participant records first (foreign key constraint)
  await db.query(
    `DELETE FROM participantstrainings WHERE training = $1`,
    [trainingId]
  )

  // Delete the training
  await db.query(
    `DELETE FROM trainings WHERE id = $1`,
    [trainingId]
  )

  return { success: true }
}
