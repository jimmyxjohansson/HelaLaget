import 'server-only'
import { adminDb } from './db'
import { AccessError } from './access'

/** Roll som admin väljer i appen. Spelare och Anhörig är läsbehörighet i databasen. */
export type MemberRole = 'player' | 'relative' | 'leader' | 'admin'

export function parseMemberRole(role: unknown): { role: 'viewer' | 'leader' | 'admin'; kind: 'player' | 'relative' | null } {
  if (role === 'player' || role === 'relative') return { role: 'viewer', kind: role }
  if (role === 'viewer') return { role: 'viewer', kind: 'relative' }
  if (role === 'leader' || role === 'admin') return { role, kind: null }
  throw new AccessError('Okänd roll.', 400)
}

/** Sätter vilka spelare i laget en Spelare/Anhörig är kopplad till. Bara lagets spelare godtas. */
export async function setLinkedPlayers(squadId: number, userId: string, playerIds: unknown) {
  const ids = Array.isArray(playerIds) ? [...new Set(playerIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))] : []
  await adminDb.query('DELETE FROM squad_member_players WHERE squad_id = $1 AND user_id = $2', [squadId, userId])
  if (!ids.length) return
  await adminDb.query(
    `INSERT INTO squad_member_players (squad_id, user_id, player_id)
     SELECT $1, $2, sp.player_id FROM squad_players sp
     WHERE sp.squad_id = $1 AND sp.player_id = ANY($3::int[])
     ON CONFLICT DO NOTHING`,
    [squadId, userId, ids],
  )
}

/**
 * Spelarna en användare med läsbehörighet får se statistik för. null = ingen
 * begränsning (ledare och admin).
 */
export async function statsPlayerScope(squad: { squadId: number; role: string } | undefined, userId: string): Promise<number[] | null> {
  if (!squad || squad.role !== 'viewer') return null
  const { data } = await adminDb.query<{ player_id: number }>(
    'SELECT player_id FROM squad_member_players WHERE squad_id = $1 AND user_id = $2',
    [squad.squadId, userId],
  )
  return data.map((r) => Number(r.player_id))
}
