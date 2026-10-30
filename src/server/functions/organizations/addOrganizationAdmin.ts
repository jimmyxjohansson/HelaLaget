import { adminDb } from '@/server/db'
import { findUserIdByEmail } from '@/server/users'
import type { User } from '@/server/types'

export const access = 'superadmin'

type Params = { organizationId: number; email: string }

/** Föreningsadmins kan skapa lag och har adminbehörighet i föreningens alla lag. */
export default async function addOrganizationAdmin(req: { params: Params; user: User }) {
  const userId = await findUserIdByEmail(req.params.email)
  await adminDb.query(
    'INSERT INTO organization_admins (organization_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.organizationId, userId],
  )
  return { ok: true }
}
