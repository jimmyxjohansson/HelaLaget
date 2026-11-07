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
 * Notis till lagets ledare om att träningsgrupperna är klara, även till den som
 * skickar. Notisen öppnar gruppsidan.
 */
export default async function notifyTrainingGroups(req: { params: Params; user: User; squad?: SquadAccess }) {
  if (!pushConfigured()) throw new AccessError('Notiser är inte inställda på servern ännu.', 503)
  const { trainingId } = req.params
  const { data } = await db.query<{ date: string; type: string | null; groups: number; players: number; logo: string | null }>(
    `SELECT t.date, t.type::text AS type,
            (SELECT COUNT(DISTINCT pt."group")::int FROM participantstrainings pt WHERE pt.training = t.id AND pt.player IS NOT NULL) AS groups,
            (SELECT COUNT(*)::int FROM participantstrainings pt WHERE pt.training = t.id AND pt.player IS NOT NULL AND pt."group" IS NOT NULL) AS players,
            (SELECT s.logo_url FROM squads s WHERE s.id = app.squad_id()) AS logo
     FROM trainings t WHERE t.id = $1`,
    [trainingId],
  )
  const t = data[0]
  if (!t) throw new AccessError('Träningen hittades inte.', 404)
  if (!t.groups) throw new AccessError('Ingen spelare är indelad i en grupp än.', 400)

  const squadId = req.squad!.squadId
  const label = t.type && t.type !== 'Träning' ? `passet (${t.type})` : 'träningen'
  const result = await sendToSquadLeaders(
    squadId,
    {
      title: '👥 Träningsgrupperna är klara',
      body: `Grupperna för ${label} ${when(t.date)} är indelade. ${t.groups} ${t.groups === 1 ? 'grupp' : 'grupper'} · ${t.players} spelare`,
      icon: t.logo ?? '/icons/icon-192.png',
      url: `/-/trainings/${trainingId}/groups?lag=${squadId}`,
      tag: `groups-${trainingId}`,
    },
  )
  return { people: result.people, devices: result.sent }
}
