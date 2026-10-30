import { adminDb } from '@/server/db'
import type { User } from '@/server/types'

export const access = 'user'

type Params = { endpoint: string }

/** Stäng av notiser på den här enheten. */
export default async function unsubscribePush(req: { params: Params; user: User }) {
  await adminDb.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
    req.user.id,
    String(req.params.endpoint ?? ''),
  ])
  return { success: true }
}
