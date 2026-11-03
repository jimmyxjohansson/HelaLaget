import { adminDb } from '@/server/db'
import { AccessError } from '@/server/access'
import { sendToSquadAdmins } from '@/server/push'
import type { User } from '@/server/types'

export const access = 'user'

type Params = {
  code: string
  message?: string | null
}

/** Ansök om att gå med i ett lag med lagets kod. Lagets admin godkänner. */
export default async function requestJoin(req: { params: Params; user: User }) {
  const code = String(req.params.code ?? '').trim().toUpperCase()
  if (!code) throw new AccessError('Ange lagets kod.', 400)

  const { data: squads } = await adminDb.query<{ id: number; name: string; organization_name: string }>(
    `SELECT s.id, s.name, o.name AS organization_name
     FROM squads s JOIN organizations o ON o.id = s.organization_id
     WHERE s.join_code = $1`,
    [code],
  )
  const squad = squads[0]
  if (!squad) throw new AccessError('Hittade inget lag med den koden. Kontrollera koden med lagets ledare.', 404)

  const { data: before } = await adminDb.query<{ status: string }>(
    `SELECT status::text FROM squad_members WHERE squad_id = $1 AND user_id = $2`,
    [squad.id, req.user.id],
  )
  const previous = before[0]?.status ?? null

  // En nekad ansökan kan skickas igen; en godkänd eller väntande ändras inte.
  const { data } = await adminDb.query<{ status: string }>(
    `INSERT INTO squad_members (squad_id, user_id, role, status, message)
     VALUES ($1, $2, 'viewer', 'pending', $3)
     ON CONFLICT (squad_id, user_id) DO UPDATE SET
       status = CASE WHEN squad_members.status = 'rejected' THEN 'pending'::membership_status ELSE squad_members.status END,
       message = CASE WHEN squad_members.status = 'rejected' THEN EXCLUDED.message ELSE squad_members.message END,
       requested_at = CASE WHEN squad_members.status = 'rejected' THEN now() ELSE squad_members.requested_at END
     RETURNING status::text`,
    [squad.id, req.user.id, req.params.message?.trim() || null],
  )

  // Ny ansökan (eller en nekad som skickats igen): tala om det för lagets admin
  if (data[0].status === 'pending' && (previous === null || previous === 'rejected')) {
    try {
      const { data: who } = await adminDb.query<{ name: string | null; email: string | null; logo: string | null }>(
        `SELECT u.raw_user_meta_data->>'name' AS name, u.email, s.logo_url AS logo
         FROM auth.users u, squads s WHERE u.id = $1 AND s.id = $2`,
        [req.user.id, squad.id],
      )
      const person = who[0]?.name?.trim() || who[0]?.email || 'Någon'
      await sendToSquadAdmins(squad.id, {
        title: `Ny ansökan till ${squad.name}`,
        body: `${person} vill gå med i ${squad.organization_name} ${squad.name}. Tryck för att godkänna.`,
        icon: who[0]?.logo || undefined,
        url: `/lag/installningar?lag=${squad.id}`,
        tag: `join-${squad.id}`,
      })
    } catch (e) {
      // Ansökan är sparad även om notisen inte gick iväg
      console.error('[requestJoin] kunde inte skicka notis', e)
    }
  }

  return { squadId: squad.id, squadName: squad.name, organizationName: squad.organization_name, status: data[0].status }
}
