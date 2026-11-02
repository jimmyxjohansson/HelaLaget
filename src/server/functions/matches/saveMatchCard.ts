import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import type { User } from '@/server/types'

type Params = {
  /** Finns det ändras kortet, annars skapas ett nytt. */
  id?: number
  matchId: number
  side: 'our' | 'their'
  color: 'Gul' | 'Röd'
  /** Vår spelare. Ignoreras för motståndarens kort. */
  player?: number | null
  minute: number | null
  /** Perioden kortet hör till (från matchklockan). Utelämnad vid ändring = behåll. */
  period?: number | null
}

/** Sparar ett gult eller rött kort i matchens tidslinje. */
export default async function saveMatchCard(req: { params: Params; user: User }) {
  const p = req.params
  if (p.side !== 'our' && p.side !== 'their') throw new AccessError('Ange vilket lag kortet gäller.', 400)
  if (p.color !== 'Gul' && p.color !== 'Röd') throw new AccessError('Ange gult eller rött kort.', 400)
  const player = p.side === 'our' ? (p.player ?? null) : null
  const period = p.period != null && [1, 2, 3].includes(Number(p.period)) ? Number(p.period) : null
  const minute = p.minute != null && Number.isFinite(Number(p.minute)) ? Math.max(0, Math.round(Number(p.minute))) : null

  if (p.id) {
    const { data } = await db.query<{ id: number }>(
      `UPDATE matchcards
          SET side = $3, color = $4, player = $5, minute = $6,
              period = CASE WHEN $7::boolean THEN $8::int ELSE period END
        WHERE id = $1 AND match = $2
        RETURNING id`,
      [p.id, p.matchId, p.side, p.color, player, minute, p.period !== undefined, period],
    )
    if (!data[0]) throw new AccessError('Kortet hittades inte.', 404)
    return { id: data[0].id }
  }

  const { data } = await db.query<{ id: number }>(
    `INSERT INTO matchcards (match, side, color, player, minute, period)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [p.matchId, p.side, p.color, player, minute, period],
  )
  return { id: data[0].id }
}
