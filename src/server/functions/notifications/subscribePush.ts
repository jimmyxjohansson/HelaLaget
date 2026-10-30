import { adminDb } from '@/server/db'
import { AccessError, getSquadAccess } from '@/server/access'
import type { User } from '@/server/types'

export const access = 'user'

type Params = {
  /** PushSubscription.toJSON() från webbläsaren */
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  userAgent?: string | null
  /** Laget som följs direkt, om användaren inte följer något lag än. */
  squadId?: number | null
}

/** Slå på notiser på den här enheten. */
export default async function subscribePush(req: { params: Params; user: User }) {
  const sub = req.params.subscription
  const endpoint = String(sub?.endpoint ?? '')
  if (!/^https:\/\//.test(endpoint) || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    throw new AccessError('Ogiltig prenumeration från webbläsaren.', 400)
  }

  // Loggar någon annan in på samma enhet flyttas prenumerationen till den användaren.
  await adminDb.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent, created_at = now()`,
    [req.user.id, endpoint, sub.keys.p256dh, sub.keys.auth, req.params.userAgent?.slice(0, 300) ?? null],
  )

  const squadId = Number(req.params.squadId) || null
  if (squadId && (await getSquadAccess(req.user.id, squadId))) {
    const { data } = await adminDb.query('SELECT 1 FROM push_squads WHERE user_id = $1', [req.user.id])
    if (data.length === 0) {
      await adminDb.query(
        'INSERT INTO push_squads (user_id, squad_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, squadId],
      )
    }
  }
  return { success: true }
}
