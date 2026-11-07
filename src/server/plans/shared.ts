import 'server-only'
import { AccessError } from '@/server/access'
import { db } from '@/server/db'
import { cleanInt, cleanText, LEVELS } from '@/server/drills/shared'

/** En träningsplan som appen skickar och får: block i ordning med övningar per grupp. */
export type PlanItemInput = {
  groupName?: string | null
  drillId?: number | null
  title?: string | null
  level?: string | null
  notes?: string | null
  /** Ledare som håller i övningen */
  leaderIds?: number[]
  /** En annan vuxen håller i övningen: null = nej, '' = ja utan namn */
  otherAdult?: string | null
}
export type PlanBlockInput = {
  name: string
  minutes?: number | null
  notes?: string | null
  items: PlanItemInput[]
}

const GROUPS = ['Grupp 1', 'Grupp 2', 'Grupp 3', 'Grupp 4', 'Grupp 5', 'Grupp 6', 'Grupp 7', 'Grupp 8', 'Målvakter', 'Station 1', 'Station 2', 'Station 3', 'Station 4']

export function cleanBlocks(blocks: unknown): PlanBlockInput[] {
  if (!Array.isArray(blocks)) throw new AccessError('Planen saknar block.', 400)
  if (blocks.length > 30) throw new AccessError('För många block.', 400)
  return blocks.map((b: PlanBlockInput) => {
    const name = cleanText(b?.name, 60) ?? 'Block'
    const items = Array.isArray(b?.items) ? b.items.slice(0, 13) : []
    return {
      name,
      minutes: cleanInt(b?.minutes, 0, 240),
      notes: cleanText(b?.notes, 1000),
      items: items.map((i) => ({
        groupName: i?.groupName && GROUPS.includes(i.groupName) ? i.groupName : null,
        drillId: cleanInt(i?.drillId, 1, 2 ** 31 - 1),
        title: cleanText(i?.title, 120),
        level: i?.level && (LEVELS as readonly string[]).includes(i.level) ? i.level : null,
        notes: cleanText(i?.notes, 1000),
        leaderIds: Array.isArray(i?.leaderIds)
          ? Array.from(new Set(i.leaderIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))).slice(0, 8)
          : [],
        otherAdult: typeof i?.otherAdult === 'string' ? (cleanText(i.otherAdult, 60) ?? '') : null,
      })),
    }
  })
}

/** Mallar sparar inte vem som håller i övningarna; det hör till varje träning. */
export function withoutLeaders(blocks: PlanBlockInput[]): PlanBlockInput[] {
  return blocks.map((b) => ({ ...b, items: b.items.map(({ leaderIds: _l, otherAdult: _o, ...i }) => i) }))
}

/**
 * Skriver om en tränings plan (ersätter den tidigare). Blocken ska redan vara rensade med cleanBlocks.
 * keepLeaders: ledarna på varje övning behålls från den gamla planen (samma block och rad),
 * när planen skrivs om från en mall.
 */
export async function writePlan(trainingId: number, blocks: PlanBlockInput[], opts: { keepLeaders?: boolean } = {}) {
  const kept = new Map<string, { leaderIds: number[]; otherAdult: string | null }>()
  if (opts.keepLeaders) {
    const { data } = await db.query<{ bp: number; ip: number; leaderIds: number[]; otherAdult: string | null }>(
      `SELECT b.position AS bp, i.position AS ip, i.leader_ids AS "leaderIds", i.other_adult AS "otherAdult"
       FROM training_block_items i JOIN training_blocks b ON b.id = i.block_id WHERE b.training_id = $1`,
      [trainingId],
    )
    for (const r of data) kept.set(`${r.bp}:${r.ip}`, { leaderIds: r.leaderIds ?? [], otherAdult: r.otherAdult })
  }
  await db.query(`DELETE FROM training_blocks WHERE training_id = $1`, [trainingId])
  for (const [bi, b] of blocks.entries()) {
    const { data } = await db.query<{ id: number }>(
      `INSERT INTO training_blocks (training_id, position, name, minutes, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [trainingId, bi, b.name, b.minutes, b.notes],
    )
    const blockId = data[0].id
    for (const [ii, i] of b.items.entries()) {
      if (!i.drillId && !i.title && !i.notes) continue
      const old = opts.keepLeaders ? kept.get(`${bi}:${ii}`) : undefined
      await db.query(
        `INSERT INTO training_block_items (block_id, position, group_name, drill_id, title, level, notes, leader_ids, other_adult)
         SELECT $1, $2, $3, d.id, $5, $6, $7, $8::int[], $9
         FROM (SELECT $4::int AS want) w LEFT JOIN drills d ON d.id = w.want`,
        [blockId, ii, i.groupName, i.drillId, i.title, i.level, i.notes, old?.leaderIds ?? i.leaderIds ?? [], old ? old.otherAdult : (i.otherAdult ?? null)],
      )
    }
  }
}

/** Kommande = träningar från i dag (svensk tid) och framåt. */
export const UPCOMING_SQL = `t.date >= ((now() AT TIME ZONE 'Europe/Stockholm')::date)::timestamp AT TIME ZONE 'Europe/Stockholm'`
