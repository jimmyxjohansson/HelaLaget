import { adminDb, withAdminTransaction } from '@/server/db'
import { AccessError, isOrganizationAdmin } from '@/server/access'
import { orgFormats } from '@/server/gameFormats'
import { DEFAULT_FORMATS, GAME_FORMATS } from '@/utils/gameFormats'
import type { SquadAccess, User } from '@/server/types'

export const access = 'admin'

type Params = {
  /** Speltid och perioder per spelform. null = appens standard. */
  formats: Record<string, { playtime: number | null; periods: number | null }>
}

const num = (v: unknown, max: number) => {
  if (v == null || v === '') return null
  const n = Math.round(Number(v))
  if (!Number.isFinite(n) || n < 1 || n > max) throw new AccessError('Speltid anges som 1–120 min och perioder som 1–10.', 400)
  return n
}

/** Föreningens standard för speltid och perioder per spelform. Gäller alla lag i föreningen. */
export default async function saveGameFormats(req: { params: Params; user: User; squad?: SquadAccess }) {
  const orgId = req.squad!.organizationId
  if (!(await isOrganizationAdmin(req.user.id, orgId))) {
    throw new AccessError('Bara föreningens admins kan ändra standarden för spelformer.', 403)
  }
  const rows = GAME_FORMATS.map((f) => {
    const v = req.params.formats?.[f] ?? { playtime: null, periods: null }
    const playtime = num(v.playtime, 120)
    const periods = num(v.periods, 10)
    // Samma som appens standard sparas inte, så att en ändrad standard i appen slår igenom
    const d = DEFAULT_FORMATS[f]
    return { f, playtime: playtime === d.playtime ? null : playtime, periods: periods === d.periods ? null : periods }
  })
  await withAdminTransaction(async (q) => {
    await q(`DELETE FROM org_game_formats WHERE organization_id = $1`, [orgId])
    for (const r of rows) {
      if (r.playtime == null && r.periods == null) continue
      await q(`INSERT INTO org_game_formats (organization_id, format, playtime, periods) VALUES ($1, $2, $3, $4)`,
        [orgId, r.f, r.playtime, r.periods])
    }
  })
  return { formats: await orgFormats(orgId, adminDb.query.bind(adminDb)) }
}
