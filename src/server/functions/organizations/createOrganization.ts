import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import { findUserIdByEmail } from '@/server/users'
import type { User } from '@/server/types'

export const access = 'superadmin'

type Params = {
  name: string
  /** Valfritt: konto som blir föreningsadmin (kan skapa lag i föreningen). */
  adminEmail?: string | null
}

export default async function createOrganization(req: { params: Params; user: User }) {
  const name = req.params.name?.trim()
  if (!name) throw new AccessError('Föreningen måste ha ett namn.', 400)
  const adminId = req.params.adminEmail?.trim() ? await findUserIdByEmail(req.params.adminEmail) : null

  const { data } = await adminDb.query<{ id: number }>('INSERT INTO organizations (name) VALUES ($1) RETURNING id', [name])
  if (adminId) {
    await adminDb.query(
      'INSERT INTO organization_admins (organization_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [data[0].id, adminId],
    )
  }
  return { id: data[0].id }
}
