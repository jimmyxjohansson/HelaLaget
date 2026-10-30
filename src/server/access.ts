import 'server-only'
import { adminDb } from './db'
import type { SquadAccess, SquadRole } from './types'

/** Användarens roll i laget, eller null om hen inte är godkänd medlem. */
export async function getSquadAccess(userId: string, squadId: number): Promise<SquadAccess | null> {
  const { data } = await adminDb.query<{ id: number; organization_id: number; role: SquadRole | null }>(
    `SELECT s.id, s.organization_id,
       CASE
         WHEN EXISTS (SELECT 1 FROM app_admins a WHERE a.user_id = $1) THEN 'admin'
         WHEN EXISTS (SELECT 1 FROM organization_admins oa
                      WHERE oa.organization_id = s.organization_id AND oa.user_id = $1) THEN 'admin'
         ELSE (SELECT m.role::text FROM squad_members m
               WHERE m.squad_id = s.id AND m.user_id = $1 AND m.status = 'approved')
       END AS role
     FROM squads s WHERE s.id = $2`,
    [userId, squadId],
  )
  const row = data[0]
  if (!row || !row.role) return null
  return { squadId: row.id, organizationId: row.organization_id, role: row.role }
}

/** Första laget användaren har åtkomst till (lägst id), eller null. */
export async function getDefaultSquadId(userId: string): Promise<number | null> {
  const { data } = await adminDb.query<{ id: number }>(
    `SELECT s.id FROM squads s
     WHERE EXISTS (SELECT 1 FROM squad_members m WHERE m.squad_id = s.id AND m.user_id = $1 AND m.status = 'approved')
        OR EXISTS (SELECT 1 FROM organization_admins oa WHERE oa.organization_id = s.organization_id AND oa.user_id = $1)
        OR EXISTS (SELECT 1 FROM app_admins a WHERE a.user_id = $1)
     ORDER BY s.id LIMIT 1`,
    [userId],
  )
  return data[0]?.id ?? null
}

export async function isSuperadmin(userId: string): Promise<boolean> {
  const { data } = await adminDb.query('SELECT 1 FROM app_admins WHERE user_id = $1', [userId])
  return data.length > 0
}

export async function isOrganizationAdmin(userId: string, organizationId: number): Promise<boolean> {
  if (await isSuperadmin(userId)) return true
  const { data } = await adminDb.query(
    'SELECT 1 FROM organization_admins WHERE user_id = $1 AND organization_id = $2',
    [userId, organizationId],
  )
  return data.length > 0
}

/** Fel som API-routen skickar vidare med rätt HTTP-status. */
export class AccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message)
  }
}
