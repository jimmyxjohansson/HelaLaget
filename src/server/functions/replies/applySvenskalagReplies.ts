import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { nameKey, type ListKey } from '@/server/replies/parse'
import { MATCH_STATUS, REPORTED_TRAINING, TRAINING_STATUS } from '@/server/replies/people'
import { currentStatuses, loadEvent } from '@/server/replies/rows'
import type { SquadAccess, User } from '@/server/types'

export const access = 'leader'

const NO_REASON = 'Ingen anledning'

type Item = {
  type: 'player' | 'leader'
  id: number
  list: ListKey
  comment?: string | null
  time?: string | null
  /** Namnet i Svenskalag. Skickas när ledaren kopplat namnet för hand, så att kopplingen sparas. */
  linkName?: string | null
}

type Params = { kind: 'training' | 'match'; id: number; items: Item[] }

/** Sparar svaren från Svenskalag på träningen eller matchen. */
export default async function applySvenskalagReplies(req: { params: Params; user: User; squad?: SquadAccess }) {
  const kind = req.params.kind === 'match' ? 'match' : 'training'
  const id = Number(req.params.id)
  const items = (req.params.items ?? []).slice(0, 200)
  await loadEvent(kind, id)
  const current = await currentStatuses(kind, id)
  const table = kind === 'training' ? 'participantstrainings' : 'participantsmatches'
  const fk = kind === 'training' ? 'training' : 'match'
  let changed = 0
  let skipped = 0

  for (const it of items) {
    if (!['attending', 'notattending', 'invited'].includes(it.list)) continue
    if (it.type !== 'player' && it.type !== 'leader') continue
    const col = it.type
    const personId = Number(it.id)
    const key = `${col}:${personId}`
    const cur = current.get(key)
    if (kind === 'training' && cur && REPORTED_TRAINING.has(cur)) { skipped++; continue }
    const comment = it.comment?.trim().slice(0, 300) || null
    // Kan ej utan kommentar: skriv "Ingen anledning", men bara om det inte redan står en anledning
    const noReason = it.list === 'notattending' && !comment
    const time = it.time && /^\d{2}:\d{2}$/.test(it.time) ? it.time : null

    if (kind === 'training') {
      const status = TRAINING_STATUS[it.list]
      const params = [id, personId, status, comment, time]
      if (current.has(key)) {
        await db.query(
          `UPDATE ${table} SET status = $3, reason = COALESCE($4, NULLIF(reason, ''), $6), reasontime = COALESCE($5, reasontime)
           WHERE ${fk} = $1 AND ${col} = $2`, [...params, noReason ? NO_REASON : null])
      } else {
        await db.query(`INSERT INTO ${table} (${fk}, ${col}, status, reason, reasontime) VALUES ($1, $2, $3, $4, $5)`,
          [id, personId, status, comment ?? (noReason ? NO_REASON : null), time])
      }
    } else {
      const status = MATCH_STATUS[it.list]
      const reason = [time, comment || (noReason ? NO_REASON : null)].filter(Boolean).join(' – ') || null
      const params = [id, personId, status, reason]
      if (current.has(key)) {
        await db.query(
          `UPDATE ${table} SET status = $3, reason = COALESCE($4, NULLIF(reason, ''), $5) WHERE ${fk} = $1 AND ${col} = $2`,
          [...params, noReason ? NO_REASON : null])
      } else {
        await db.query(`INSERT INTO ${table} (${fk}, ${col}, status, reason) VALUES ($1, $2, $3, $4)`, [id, personId, status, reason ?? (noReason ? NO_REASON : null)])
      }
    }
    changed++

    if (it.linkName?.trim()) {
      await db.query(
        `INSERT INTO svenskalag_name_links (squad_id, name_key, player, leader)
         VALUES (app.squad_id(), $1, $2, $3)
         ON CONFLICT (squad_id, name_key) DO UPDATE SET player = EXCLUDED.player, leader = EXCLUDED.leader`,
        [nameKey(it.linkName), col === 'player' ? personId : null, col === 'leader' ? personId : null],
      )
    }
  }
  if (!changed && !skipped) throw new AccessError('Inga svar att spara.', 400)
  return { changed, skipped }
}
