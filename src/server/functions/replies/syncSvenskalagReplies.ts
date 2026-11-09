import { buildRows } from '@/server/replies/rows'
import { parseKind } from '@/server/replies/people'
import type { ListKey } from '@/server/replies/parse'
import type { SquadAccess, User } from '@/server/types'
import applySvenskalagReplies from './applySvenskalagReplies'

export const access = 'leader'

type Params = {
  kind: 'training' | 'match' | 'cup'
  id: number
  lists: Partial<Record<ListKey, string[][] | null>>
}

/**
 * Sparar direkt alla svar som kan kopplas till en person i laget, och talar om
 * vilka namn som inte gick att koppla. Används av Synka svar på planeringen.
 */
export default async function syncSvenskalagReplies(req: { params: Params; user: User; squad?: SquadAccess }) {
  const kind = parseKind(req.params.kind)
  const id = Number(req.params.id)
  const { rows } = await buildRows(kind, id, req.params.lists ?? {})
  const auto = rows.filter((r) => r.match && !r.locked)
  const changed = auto.filter((r) => r.current !== r.next).length
  if (auto.length) {
    await applySvenskalagReplies({
      ...req,
      params: {
        kind,
        id,
        items: auto.map((r) => ({ type: r.match!.type, id: r.match!.id, list: r.list, comment: r.comment, time: r.time, repliedAt: r.repliedAt })),
      },
    })
  }
  return {
    read: rows.length,
    saved: auto.length,
    changed,
    unknown: rows.filter((r) => !r.match && !r.locked).map((r) => r.name),
  }
}
