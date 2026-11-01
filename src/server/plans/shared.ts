import 'server-only'
import { AccessError } from '@/server/access'
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
