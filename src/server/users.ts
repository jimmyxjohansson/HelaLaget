import 'server-only'
import { adminDb } from './db'
import { AccessError } from './access'

/** Hitta ett registrerat konto via e-post. */
export async function findUserIdByEmail(email: string): Promise<string> {
  const clean = String(email ?? '').trim().toLowerCase()
  if (!clean) throw new AccessError('Ange en e-postadress.', 400)
  const { data } = await adminDb.query<{ id: string }>('SELECT id FROM auth.users WHERE lower(email) = $1', [clean])
  if (!data[0]) {
    throw new AccessError(`Det finns inget konto för ${clean}. Be personen registrera sig i appen först.`, 404)
  }
  return data[0].id
}

/** Visningsnamn för användare: namnet, annars delen före @ i e-postadressen. */
export async function userNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)))
  if (!unique.length) return new Map()
  const { data } = await adminDb.query<{ id: string; name: string | null }>(
    `SELECT id::text, COALESCE(NULLIF(raw_user_meta_data->>'name', ''), split_part(email, '@', 1)) AS name
     FROM auth.users WHERE id = ANY($1::uuid[])`,
    [unique],
  )
  return new Map(data.filter((u) => u.name).map((u) => [u.id, u.name!]))
}
