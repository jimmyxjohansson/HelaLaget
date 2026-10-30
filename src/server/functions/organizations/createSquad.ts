import { adminDb } from '@/server/db'
import { AccessError, isOrganizationAdmin } from '@/server/access'
import { findUserIdByEmail } from '@/server/users'
import type { User } from '@/server/types'

// Superadmins och föreningens admins (kontrolleras nedan)
export const access = 'user'

type Params = {
  organizationId: number
  name: string
  /** Valfritt: konto som blir lagets admin. */
  adminEmail?: string | null
}

export default async function createSquad(req: { params: Params; user: User }) {
  const { organizationId } = req.params
  if (!(await isOrganizationAdmin(req.user.id, organizationId))) {
    throw new AccessError('Bara föreningens admins kan skapa lag.')
  }
  const name = req.params.name?.trim()
  if (!name) throw new AccessError('Laget måste ha ett namn.', 400)
  const adminId = req.params.adminEmail?.trim() ? await findUserIdByEmail(req.params.adminEmail) : null

  const { data } = await adminDb.query<{ id: number }>(
    'INSERT INTO squads (organization_id, name) VALUES ($1, $2) RETURNING id',
    [organizationId, name],
  )
  if (adminId) {
    await adminDb.query(
      `INSERT INTO squad_members (squad_id, user_id, role, status, decided_at, decided_by)
       VALUES ($1, $2, 'admin', 'approved', now(), $3)
       ON CONFLICT (squad_id, user_id) DO UPDATE SET role = 'admin', status = 'approved'`,
      [data[0].id, adminId, req.user.id],
    )
  }
  return { id: data[0].id }
}
