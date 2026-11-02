import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import type { User } from '@/server/types'

export const access = 'user'

type Params = { activityId: string }

/**
 * Hittar träningen eller matchen som hör till en aktivitet på Svenskalag,
 * bland lagen där användaren är ledare eller admin.
 */
export default async function findSvenskalagActivity(req: { params: Params; user: User }) {
  const activityId = String(req.params.activityId ?? '').replace(/\D/g, '')
  if (!activityId) throw new AccessError('Aktiviteten saknar nummer.', 400)
  const pattern = `/aktivitet/${activityId}(/|$|[?#])`
  const { data } = await adminDb.query<{ kind: 'training' | 'match'; id: number; squad_id: number; date: string; title: string | null }>(
    `WITH mine AS (
       SELECT s.id FROM squads s
       WHERE EXISTS (SELECT 1 FROM app_admins a WHERE a.user_id = $2)
          OR EXISTS (SELECT 1 FROM organization_admins oa WHERE oa.organization_id = s.organization_id AND oa.user_id = $2)
          OR EXISTS (SELECT 1 FROM squad_members m WHERE m.squad_id = s.id AND m.user_id = $2
                     AND m.status = 'approved' AND m.role IN ('leader', 'admin'))
     )
     SELECT 'training' AS kind, t.id, t.squad_id, t.date, t.type::text AS title
       FROM trainings t WHERE t.squad_id IN (SELECT id FROM mine) AND t.svenskalag ~ $1
     UNION ALL
     SELECT 'match' AS kind, m.id, m.squad_id, m.date, COALESCE(tm.team, m.teamname) AS title
       FROM matches m LEFT JOIN teams tm ON tm.id = m.vs
       WHERE m.squad_id IN (SELECT id FROM mine) AND m.svenskalag ~ $1
     ORDER BY date DESC LIMIT 1`,
    [pattern, req.user.id],
  )
  return data[0] ?? null
}
