import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import type { User } from '@/server/types'

export const access = 'user'

type Params = Record<string, never>

/** Föreningar och lag som användaren administrerar (superadmin: alla). */
export default async function getOrganizations(req: { params: Params; user: User }) {
  const { data } = await adminDb.query<{
    id: number
    name: string
    admins: string[] | null
    squads: { id: number; name: string; members: number; pending: number; admins: string[] | null }[] | null
  }>(
    `WITH me AS (SELECT EXISTS (SELECT 1 FROM app_admins WHERE user_id = $1) AS is_super)
     SELECT o.id, o.name,
       (SELECT array_agg(u.email ORDER BY u.email) FROM organization_admins oa
          JOIN auth.users u ON u.id = oa.user_id WHERE oa.organization_id = o.id) AS admins,
       (SELECT json_agg(json_build_object(
           'id', s.id, 'name', s.name,
           'members', (SELECT count(*) FROM squad_members m WHERE m.squad_id = s.id AND m.status = 'approved'),
           'pending', (SELECT count(*) FROM squad_members m WHERE m.squad_id = s.id AND m.status = 'pending'),
           'admins', (SELECT array_agg(u.email ORDER BY u.email) FROM squad_members m JOIN auth.users u ON u.id = m.user_id
                      WHERE m.squad_id = s.id AND m.status = 'approved' AND m.role = 'admin')
         ) ORDER BY s.name) FROM squads s WHERE s.organization_id = o.id) AS squads
     FROM organizations o, me
     WHERE me.is_super
        OR EXISTS (SELECT 1 FROM organization_admins oa WHERE oa.organization_id = o.id AND oa.user_id = $1)
     ORDER BY o.name`,
    [req.user.id],
  )
  const { data: me } = await adminDb.query<{ is_super: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM app_admins WHERE user_id = $1) AS is_super',
    [req.user.id],
  )
  if (!me[0]?.is_super && data.length === 0) throw new AccessError('Du administrerar ingen förening.')
  return { isSuperadmin: me[0]?.is_super ?? false, organizations: data }
}
