import { AccessError } from '@/server/access'
import { pushConfigured, sendToUser } from '@/server/push'
import type { User } from '@/server/types'

export const access = 'user'

/** Skicka en testnotis till alla användarens enheter. */
export default async function sendTestPush(req: { params: Record<string, never>; user: User }) {
  if (!pushConfigured()) throw new AccessError('Notiser är inte inställda på servern ännu (VAPID-nycklar saknas).', 503)
  const result = await sendToUser(req.user.id, {
    title: '⚽ Testnotis från Hela Laget',
    body: 'Notiserna fungerar. Så här ser det ut när laget gör mål.',
    url: '/notiser',
    tag: 'test',
  })
  if (result.sent === 0) {
    throw new AccessError('Ingen enhet tog emot notisen. Slå av och på notiserna och försök igen.', 409)
  }
  return result
}
