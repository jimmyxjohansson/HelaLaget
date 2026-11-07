import { db } from '@/server/db'
import { AccessError } from '@/server/access'
import { pushConfigured, sendToSquadLeaders } from '@/server/push'
import type { SquadAccess, User } from '@/server/types'

type Params = { trainingId: number }

/** Tider sparas som väggklocka i UTC (17:30Z = 17:30 svensk tid). */
function when(date: string) {
  const d = new Date(date)
  const day = d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  return `${day} kl. ${time}`
}

/**
 * Notis till lagets ledare om att träningsplanen är klar, även till den som
 * skickar. Notisen öppnar planen.
 */
export default async function notifyTrainingPlan(req: { params: Params; user: User; squad?: SquadAccess }) {
  if (!pushConfigured()) throw new AccessError('Notiser är inte inställda på servern ännu.', 503)
  const { trainingId } = req.params
  const { data } = await db.query<{ date: string; type: string | null; blocks: number; minutes: number | null; logo: string | null }>(
    `SELECT t.date, t.type::text AS type,
            (SELECT COUNT(*)::int FROM training_blocks b WHERE b.training_id = t.id) AS blocks,
            (SELECT SUM(b.minutes)::int FROM training_blocks b WHERE b.training_id = t.id) AS minutes,
            (SELECT s.logo_url FROM squads s WHERE s.id = app.squad_id()) AS logo
     FROM trainings t WHERE t.id = $1`,
    [trainingId],
  )
  const t = data[0]
  if (!t) throw new AccessError('Träningen hittades inte.', 404)
  if (!t.blocks) throw new AccessError('Planen är tom. Lägg till block innan du skickar den.', 400)

  const squadId = req.squad!.squadId
  const label = t.type && t.type !== 'Träning' ? `passet (${t.type})` : 'träningen'
  const details = [`${t.blocks} block`, t.minutes ? `${t.minutes} min` : null].filter(Boolean).join(' · ')
  const result = await sendToSquadLeaders(
    squadId,
    {
      title: '📋 Träningsplanen är klar',
      body: `Planen för ${label} ${when(t.date)} är redo. ${details}`,
      icon: t.logo ?? '/icons/icon-192.png',
      url: `/-/trainings/${trainingId}/plan?lag=${squadId}`,
      tag: `plan-${trainingId}`,
    },
    undefined,
    req.user.id,
  )
  return { people: result.people, devices: result.sent }
}
