import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { nameKey, type ListKey } from '@/server/replies/parse'
import { MATCH_STATUS, parseKind, participantTable, REPORTED_TRAINING, TRAINING_STATUS } from '@/server/replies/people'
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
  /** När svaret lämnades i Svenskalag, 'ÅÅÅÅ-MM-DDTHH:MM' */
  repliedAt?: string | null
  /** Namnet i Svenskalag. Skickas när ledaren kopplat namnet för hand, så att kopplingen sparas. */
  linkName?: string | null
}

type Params = { kind: 'training' | 'match' | 'cup'; id: number; items: Item[] }

/** Sparar svaren från Svenskalag på träningen, matchen eller cupen. */
export default async function applySvenskalagReplies(req: { params: Params; user: User; squad?: SquadAccess }) {
  const kind = parseKind(req.params.kind)
  const id = Number(req.params.id)
  // En person kan förekomma flera gånger (t.ex. två Svenskalag-namn kopplade till samma spelare,
  // eller med i både Kommer och Kallade). Ett svar (Kommer/Kan ej) går före Kallade, annars gäller det sista.
  const byPerson = new Map<string, Item>()
  for (const it of (req.params.items ?? []).slice(0, 200)) {
    const k = `${it.type}:${Number(it.id)}`
    const prev = byPerson.get(k)
    if (prev && prev.list !== 'invited' && it.list === 'invited') {
      if (it.linkName?.trim() && !prev.linkName?.trim()) prev.linkName = it.linkName
      continue
    }
    byPerson.set(k, prev?.linkName?.trim() && !it.linkName?.trim() ? { ...it, linkName: prev.linkName } : it)
  }
  const items = [...byPerson.values()]
  await loadEvent(kind, id)
  const current = await currentStatuses(kind, id)
  const { table, fk } = participantTable(kind)
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
    const trimmed = it.comment?.trim().slice(0, 300) ?? ''
    const comment = /[\p{L}\d]/u.test(trimmed) ? trimmed : null
    // Kan ej utan kommentar: skriv "Ingen anledning", men bara om det inte redan står en anledning
    const noReason = it.list === 'notattending' && !comment
    const time = it.list === 'notattending' && it.time && /^\d{2}:\d{2}$/.test(it.time) ? it.time : null

    if (kind === 'training') {
      const status = TRAINING_STATUS[it.list]
      // Svarstiden från Svenskalag (inte för Kallade, som inte har svarat)
      const repliedAt = it.list !== 'invited' && it.repliedAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(it.repliedAt) ? it.repliedAt : null
      const params = [id, personId, status, comment, time]
      if (current.has(key)) {
        await db.query(
          `UPDATE ${table} SET status = $3, reason = COALESCE($4, NULLIF(reason, ''), $6), reasontime = COALESCE($5, reasontime),
             replied_at = COALESCE($7::timestamp, replied_at)
           WHERE ${fk} = $1 AND ${col} = $2`, [...params, noReason ? NO_REASON : null, repliedAt])
      } else {
        // Inte om raden hann skapas av ett annat anrop (t.ex. dubbeltryck på Spara)
        await db.query(`INSERT INTO ${table} (${fk}, ${col}, status, reason, reasontime, replied_at)
          SELECT $1, $2, $3, $4, $5, $6::timestamp
          WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${fk} = $1 AND ${col} = $2)`,
          [id, personId, status, comment ?? (noReason ? NO_REASON : null), time, repliedAt])
        current.set(key, status)
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
        await db.query(`INSERT INTO ${table} (${fk}, ${col}, status, reason)
          SELECT $1, $2, $3, $4
          WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${fk} = $1 AND ${col} = $2)`,
          [id, personId, status, reason ?? (noReason ? NO_REASON : null)])
        current.set(key, status)
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
