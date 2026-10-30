import { adminDb } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'user'

type Params = {
  /** Laget i användarens cookie, om något. */
  squadId?: number | null
}

export type Membership = {
  squadId: number
  squadName: string
  organizationId: number
  organizationName: string
  role: 'viewer' | 'leader' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  primaryColor: string
  accentColor: string
  logoUrl: string | null
  planningUrl: string | null
  trainingAppUrl: string | null
}

/** Inloggad användare, alla lag hen är med i eller har ansökt till, och valt lag. */
export default async function getMe(req: { params: Params; user: User }) {
  const userId = req.user.id

  const [profile, memberships, orgAdmin] = await Promise.all([
    adminDb.query<{ name: string | null; is_superadmin: boolean }>(
      `SELECT u.raw_user_meta_data->>'name' AS name,
         EXISTS (SELECT 1 FROM app_admins a WHERE a.user_id = u.id) AS is_superadmin
       FROM auth.users u WHERE u.id = $1`,
      [userId],
    ),
    adminDb.query<Membership>(
      `SELECT s.id AS "squadId", s.name AS "squadName",
         o.id AS "organizationId", o.name AS "organizationName",
         CASE WHEN sa.is_super OR oa.user_id IS NOT NULL THEN 'admin' ELSE m.role::text END AS role,
         CASE WHEN sa.is_super OR oa.user_id IS NOT NULL THEN 'approved' ELSE m.status::text END AS status,
         s.primary_color AS "primaryColor", s.accent_color AS "accentColor", s.logo_url AS "logoUrl",
         s.planning_url AS "planningUrl", s.training_app_url AS "trainingAppUrl"
       FROM squads s
       JOIN organizations o ON o.id = s.organization_id
       CROSS JOIN (SELECT EXISTS (SELECT 1 FROM app_admins WHERE user_id = $1) AS is_super) sa
       LEFT JOIN organization_admins oa ON oa.organization_id = s.organization_id AND oa.user_id = $1
       LEFT JOIN squad_members m ON m.squad_id = s.id AND m.user_id = $1
       WHERE sa.is_super OR oa.user_id IS NOT NULL OR m.user_id IS NOT NULL
       ORDER BY s.id`,
      [userId],
    ),
    adminDb.query<{ organization_id: number }>(
      'SELECT organization_id FROM organization_admins WHERE user_id = $1',
      [userId],
    ),
  ])

  // Samma val som servern gör (access.ts): begärt lag om det är godkänt, annars första godkända.
  const approved = memberships.data.filter((m) => m.status === 'approved')
  const current = approved.find((m) => m.squadId === req.params.squadId) ?? approved[0] ?? null

  return {
    user: { id: userId, email: req.user.email, name: profile.data[0]?.name ?? null },
    isSuperadmin: profile.data[0]?.is_superadmin ?? false,
    adminOrganizationIds: orgAdmin.data.map((r) => r.organization_id),
    memberships: memberships.data,
    current,
  }
}
