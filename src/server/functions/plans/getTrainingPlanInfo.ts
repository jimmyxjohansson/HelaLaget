import { adminDb, db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { trainingId: number }

/** Uppgifter om en tränings plan: ambulerande ledare och vem som sparade den senast. */
export default async function getTrainingPlanInfo(req: { params: Params; user: User }) {
  const { data } = await db.query<{ roamingLeaderIds: number[]; savedBy: string | null; savedAt: string | null }>(
    `SELECT plan_roaming_leader_ids AS "roamingLeaderIds", plan_saved_by AS "savedBy", plan_saved_at AS "savedAt"
     FROM trainings WHERE id = $1`,
    [Number(req.params.trainingId)],
  )
  const t = data[0]
  if (!t) return null
  let savedByName: string | null = null
  if (t.savedBy) {
    // Namnet från kontot; aldrig e-postadressen, bara delen före @ om namn saknas
    const { data: u } = await adminDb.query<{ name: string | null }>(
      `SELECT COALESCE(NULLIF(raw_user_meta_data->>'name', ''), split_part(email, '@', 1)) AS name FROM auth.users WHERE id = $1`,
      [t.savedBy],
    )
    savedByName = u[0]?.name ?? null
  }
  return { roamingLeaderIds: t.roamingLeaderIds ?? [], savedByName, savedAt: t.savedAt }
}
