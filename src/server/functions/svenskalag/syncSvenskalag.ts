import { syncSquad } from '@/server/svenskalag/sync'
import type { SquadAccess, User } from '@/server/types'

export const access = 'leader'

type Params = Record<string, never>

/** Hämta från Svenskalag nu (samma som den dagliga körningen). */
export default async function syncSvenskalag(req: { params: Params; user: User; squad?: SquadAccess }) {
  return syncSquad(req.squad!.squadId)
}
