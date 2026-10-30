import { adminDb } from '@/server/db'
import { AccessError, getSquadAccess } from '@/server/access'
import type { User } from '@/server/types'

export const access = 'user'

type Params = { squadId: number; enabled: boolean }

/** Följ eller sluta följa ett lags matchnotiser. */
export default async function setPushSquad(req: { params: Params; user: User }) {
  const squadId = Number(req.params.squadId)
  if (req.params.enabled) {
    if (!squadId || !(await getSquadAccess(req.user.id, squadId))) {
      throw new AccessError('Du är inte med i det laget.')
    }
    await adminDb.query('INSERT INTO push_squads (user_id, squad_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      req.user.id,
      squadId,
    ])
  } else {
    await adminDb.query('DELETE FROM push_squads WHERE user_id = $1 AND squad_id = $2', [req.user.id, squadId])
  }
  return { success: true }
}
