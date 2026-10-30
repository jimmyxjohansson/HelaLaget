import { adminDb } from '@/server/db'
import { AccessError, isOrganizationAdmin } from '@/server/access'
import { findUserIdByEmail } from '@/server/users'
import type { User } from '@/server/types'

// Superadmins och föreningens admins (kontrolleras nedan)
export const access = 'user'

type Params = { squadId: number; email: string }

export default async function addSquadAdmin(req: { params: Params; user: User }) {
  const { data: squads } = await adminDb.query<{ organization_id: number }>(
    'SELECT organization_id FROM squads WHERE id = $1',
    [req.params.squadId],
  )
  if (!squads[0] || !(await isOrganizationAdmin(req.user.id, squads[0].organization_id))) {
    throw new AccessError('Bara föreningens admins kan utse lagadmins.')
  }
  const userId = await findUserIdByEmail(req.params.email)
  await adminDb.query(
    `INSERT INTO squad_members (squad_id, user_id, role, status, decided_at, decided_by)
     VALUES ($1, $2, 'admin', 'approved', now(), $3)
     ON CONFLICT (squad_id, user_id) DO UPDATE SET role = 'admin', status = 'approved', decided_at = now()`,
    [req.params.squadId, userId, req.user.id],
  )
  return { ok: true }
}
