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
      })),
    }
  })
}

/** Skriver om en tränings plan (ersätter den tidigare). Blocken ska redan vara rensade med cleanBlocks. */
export async function writePlan(trainingId: number, blocks: PlanBlockInput[]) {
  await db.query(`DELETE FROM training_blocks WHERE training_id = $1`, [trainingId])
  for (const [bi, b] of blocks.entries()) {
    const { data } = await db.query<{ id: number }>(
      `INSERT INTO training_blocks (training_id, position, name, minutes, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [trainingId, bi, b.name, b.minutes, b.notes],
    )
    const blockId = data[0].id
    for (const [ii, i] of b.items.entries()) {
      if (!i.drillId && !i.title && !i.notes) continue
      await db.query(
        `INSERT INTO training_block_items (block_id, position, group_name, drill_id, title, level, notes)
         SELECT $1, $2, $3, d.id, $5, $6, $7
         FROM (SELECT $4::int AS want) w LEFT JOIN drills d ON d.id = w.want`,
        [blockId, ii, i.groupName, i.drillId, i.title, i.level, i.notes],
      )
    }
  }
}

/** Kommande = träningar från i dag (svensk tid) och framåt. */
export const UPCOMING_SQL = `t.date >= ((now() AT TIME ZONE 'Europe/Stockholm')::date)::timestamp AT TIME ZONE 'Europe/Stockholm'`
