import 'server-only'
import webpush from 'web-push'
import { adminDb } from './db'

/**
 * Push-notiser via Web Push (samma standard som Android och iPhone använder för
 * installerade webbappar). Nycklarna skapas med scripts/generate-vapid-keys.mjs
 * och läggs i Vercel. Saknas de skickas inga notiser, men inget annat påverkas.
 */

export type PushPayload = {
  title: string
  body: string
  /** Bild i notisen (lagets logga). iPhone visar alltid appens ikon i stället. */
  icon?: string
  /** Sidan som öppnas när man trycker på notisen. */
  url?: string
  /** Notiser med samma tagg ersätter varandra (t.ex. en per match). */
  tag?: string
}

type Subscription = { id: number; endpoint: string; p256dh: string; auth: string; user_id: string }

type Audience = 'squad' | 'leaders' | 'admins'

let configured = false

function clean(v: string | undefined) {
  return (v ?? '').trim().replace(/^["']|["']$/g, '').trim()
}

export function vapidPublicKey(): string | null {
  return clean(process.env.VAPID_PUBLIC_KEY) || null
}

/** Sant om nycklarna finns. Ställer in web-push första gången. */
export function pushConfigured(): boolean {
  if (configured) return true
  const publicKey = vapidPublicKey()
  const privateKey = clean(process.env.VAPID_PRIVATE_KEY)
  if (!publicKey || !privateKey) return false
  try {
    webpush.setVapidDetails(clean(process.env.VAPID_SUBJECT) || 'https://hela-laget.vercel.app', publicKey, privateKey)
    configured = true
  } catch (e) {
    console.error('[push] ogiltiga VAPID-nycklar', e)
  }
  return configured
}

async function send(subs: Subscription[], payload: PushPayload) {
  if (subs.length === 0) return { sent: 0, removed: 0 }
  const body = JSON.stringify(payload)
  const gone: number[] = []
  const ok: number[] = []
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          // Når notisen inte fram inom en timme (telefonen avstängd) är den inte längre intressant.
          { TTL: 60 * 60, urgency: 'high' },
        )
        ok.push(s.id)
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        // 404/410: enheten har avregistrerat sig (avinstallerad app, nekad behörighet)
        if (status === 404 || status === 410) gone.push(s.id)
        else console.error(`[push] kunde inte skicka till prenumeration ${s.id}`, status ?? e)
      }
    }),
  )
  if (gone.length) await adminDb.query('DELETE FROM push_subscriptions WHERE id = ANY($1::bigint[])', [gone])
  if (ok.length) await adminDb.query('UPDATE push_subscriptions SET last_used_at = now() WHERE id = ANY($1::bigint[])', [ok])
  return { sent: ok.length, removed: gone.length, failed: subs.length - ok.length - gone.length }
}

/** Skickar och sparar notisen i lagets notislogg. Loggen får aldrig stoppa själva notisen. */
async function sendAndLog(squadId: number, audience: Audience, subs: Subscription[], payload: PushPayload, sentBy?: string | null) {
  const result = await send(subs, payload)
  const people = new Set(subs.map((s) => s.user_id)).size
  try {
    await adminDb.query(
      `INSERT INTO push_log (squad_id, audience, title, body, url, sent_by, people, devices, failed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [squadId, audience, payload.title, payload.body, payload.url ?? null, sentBy ?? null, people, result.sent, result.failed],
    )
  } catch (e) {
    console.error('[push] kunde inte spara i notisloggen', e)
  }
  return { ...result, people }
}

/**
 * Skicka till alla som följer laget och fortfarande har åtkomst till det
 * (godkänd medlem, föreningsadmin eller superadmin), utom den som orsakade händelsen.
 */
export async function sendToSquad(squadId: number, payload: PushPayload, exceptUserId?: string) {
  if (!pushConfigured()) return { sent: 0, removed: 0 }
  const { data } = await adminDb.query<Subscription>(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.user_id
     FROM push_subscriptions ps
     JOIN push_squads f ON f.user_id = ps.user_id AND f.squad_id = $1
     JOIN squads s ON s.id = f.squad_id
     WHERE ($2::uuid IS NULL OR ps.user_id <> $2::uuid)
       AND (EXISTS (SELECT 1 FROM squad_members m
                    WHERE m.squad_id = s.id AND m.user_id = ps.user_id AND m.status = 'approved')
            OR EXISTS (SELECT 1 FROM organization_admins oa
                       WHERE oa.organization_id = s.organization_id AND oa.user_id = ps.user_id)
            OR EXISTS (SELECT 1 FROM app_admins a WHERE a.user_id = ps.user_id))`,
    [squadId, exceptUserId ?? null],
  )
  return sendAndLog(squadId, 'squad', data, payload, exceptUserId)
}

/**
 * Skicka till lagets ledare och admin som följer laget (inte läsbehörighet),
 * utom den som skickar. Föreningsadmin och superadmin räknas som admin.
 * Returnerar också hur många personer som nåddes.
 */
export async function sendToSquadLeaders(squadId: number, payload: PushPayload, exceptUserId?: string, sentBy?: string) {
  if (!pushConfigured()) return { sent: 0, removed: 0, people: 0 }
  const { data } = await adminDb.query<Subscription>(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.user_id
     FROM push_subscriptions ps
     JOIN push_squads f ON f.user_id = ps.user_id AND f.squad_id = $1
     JOIN squads s ON s.id = f.squad_id
     WHERE ($2::uuid IS NULL OR ps.user_id <> $2::uuid)
       AND (EXISTS (SELECT 1 FROM squad_members m
                    WHERE m.squad_id = s.id AND m.user_id = ps.user_id AND m.status = 'approved'
                      AND m.role IN ('leader', 'admin'))
            OR EXISTS (SELECT 1 FROM organization_admins oa
                       WHERE oa.organization_id = s.organization_id AND oa.user_id = ps.user_id)
            OR EXISTS (SELECT 1 FROM app_admins a WHERE a.user_id = ps.user_id))`,
    [squadId, exceptUserId ?? null],
  )
  return sendAndLog(squadId, 'leaders', data, payload, sentBy ?? exceptUserId)
}

/**
 * Skicka till lagets admin och föreningens admin, på alla deras enheter, oavsett
 * vilka lag de följer (t.ex. en ansökan som väntar på godkännande).
 */
export async function sendToSquadAdmins(squadId: number, payload: PushPayload) {
  if (!pushConfigured()) return { sent: 0, removed: 0 }
  const { data } = await adminDb.query<Subscription>(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.user_id
     FROM push_subscriptions ps
     JOIN squads s ON s.id = $1
     WHERE EXISTS (SELECT 1 FROM squad_members m
                   WHERE m.squad_id = s.id AND m.user_id = ps.user_id AND m.status = 'approved' AND m.role = 'admin')
        OR EXISTS (SELECT 1 FROM organization_admins oa
                   WHERE oa.organization_id = s.organization_id AND oa.user_id = ps.user_id)`,
    [squadId],
  )
  return sendAndLog(squadId, 'admins', data, payload)
}

/** Skicka till alla användarens enheter (testnotis). */
export async function sendToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured()) return { sent: 0, removed: 0 }
  const { data } = await adminDb.query<Subscription>(
    'SELECT id, endpoint, p256dh, auth, user_id FROM push_subscriptions WHERE user_id = $1',
    [userId],
  )
  return send(data, payload)
}
