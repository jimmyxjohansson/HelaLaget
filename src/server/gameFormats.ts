import 'server-only'
import { adminDb, type Query } from './db'
import { mergeFormats, type FormatDefaults } from '../utils/gameFormats'

/** Föreningens värden per spelform (appens standard där föreningen inte ändrat). */
export async function orgFormats(organizationId: number, q: Query = adminDb.query.bind(adminDb)): Promise<FormatDefaults> {
  const { data } = await q<{ format: string; playtime: number | null; periods: number | null }>(
    `SELECT format, playtime, periods FROM org_game_formats WHERE organization_id = $1`,
    [organizationId],
  )
  return mergeFormats(data)
}

/** Lagets spelform med speltid och perioder, eller null om laget inte har någon spelform. */
export async function squadGameFormat(squadId: number, q: Query = adminDb.query.bind(adminDb)) {
  const { data } = await q<{ game_format: string | null; organization_id: number }>(
    `SELECT game_format, organization_id FROM squads WHERE id = $1`,
    [squadId],
  )
  const row = data[0]
  if (!row?.game_format) return null
  const d = (await orgFormats(row.organization_id, q))[row.game_format]
  return { format: row.game_format, playtime: d?.playtime ?? null, periods: d?.periods ?? null }
}
