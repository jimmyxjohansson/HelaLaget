import { buildRows } from '@/server/replies/rows'
import type { ListKey } from '@/server/replies/parse'
import type { User } from '@/server/types'

export const access = 'leader'

type Params = {
  kind: 'training' | 'match'
  id: number
  lists: Partial<Record<ListKey, string[][] | null>>
}

/** Förslag på svar från Svenskalag: vem som matchar vem och vilken status det blir. */
export default async function previewSvenskalagReplies(req: { params: Params; user: User }) {
  const { kind, id, lists } = req.params
  return buildRows(kind === 'match' ? 'match' : 'training', Number(id), lists ?? {})
}
