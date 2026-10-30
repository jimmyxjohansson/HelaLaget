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
