import { adminDb } from '@/server/db'
import { pushConfigured, vapidPublicKey } from '@/server/push'
import type { User } from '@/server/types'

export const access = 'user'

type Params = {
  /** Den här enhetens prenumeration, om webbläsaren har en. */
  endpoint?: string | null
}

/** Notisinställningar för inloggad användare och den här enheten. */
export default async function getPushStatus(req: { params: Params; user: User }) {
  const configured = pushConfigured()
  const { data: squads } = await adminDb.query<{ squad_id: number }>(
    'SELECT squad_id FROM push_squads WHERE user_id = $1 ORDER BY squad_id',
    [req.user.id],
  )
  let deviceSubscribed = false
  if (req.params.endpoint) {
    const { data } = await adminDb.query(
      'SELECT 1 FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, req.params.endpoint],
    )
    deviceSubscribed = data.length > 0
  }
  const { data: devices } = await adminDb.query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE user_id = $1',
    [req.user.id],
  )
  return {
    configured,
    publicKey: configured ? vapidPublicKey() : null,
    deviceSubscribed,
    deviceCount: devices[0]?.n ?? 0,
    squadIds: squads.map((s) => s.squad_id),
  }
}
