import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { Pool, types, type PoolClient } from 'pg'

// Returnera värden i samma form som Retool gjorde, så att vyerna fungerar oförändrade:
// - date → 'ÅÅÅÅ-MM-DD' som sträng (visas rått i bl.a. cuplistan)
// - timestamp utan tidszon tolkas som UTC (oberoende av serverns tidszon)
// - timestamptz blir Date och skickas som ISO-sträng i JSON-svaret
// - bigint/numeric förblir strängar (vyerna gör Number() själva)
types.setTypeParser(1082 /* date */, (v: string) => v)
types.setTypeParser(1114 /* timestamp */, (v: string) => new Date(`${v.replace(' ', 'T')}Z`))

const globalForDb = globalThis as unknown as { pgPool?: Pool }

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL saknas. Se .env.example.')
  return new Pool({
    connectionString,
    // Supabase kräver SSL. Sätt DATABASE_SSL=disable för en lokal databas utan SSL.
    ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false },
    // Serverless: få anslutningar per instans, poolern i Supabase sköter resten.
    max: 3,
    idleTimeoutMillis: 10_000,
  })
}

function pool() {
  if (!globalForDb.pgPool) globalForDb.pgPool = createPool()
  return globalForDb.pgPool
}

const squadClient = new AsyncLocalStorage<PoolClient>()

export type SquadContext = { userId: string; squadId: number }

/**
 * Kör `fn` i en transaktion som rollen app_user med inloggad användare och
 * valt lag satta. Databasens RLS-regler släpper då bara igenom det lagets
 * data, och bara om användaren är godkänd medlem (se supabase/migrations).
 */
export async function withSquadContext<T>(ctx: SquadContext, fn: () => Promise<T>): Promise<T> {
  const client = await pool().connect()
  try {
    await client.query('BEGIN')
    await client.query('SET LOCAL ROLE app_user')
    await client.query(
      "SELECT set_config('app.user_id', $1, true), set_config('app.squad_id', $2, true)",
      [ctx.userId, String(ctx.squadId)],
    )
    const result = await squadClient.run(client, fn)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

/**
 * Ersätter Retools `retoolDb` i lagets funktioner. Samma anrop:
 * db.query<T>(sql, params) → { data: T[] }. Fungerar bara inuti en lagkontext,
 * så att ingen fråga av misstag kan köras förbi RLS.
 */
export const db = {
  async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<{ data: T[] }> {
    const client = squadClient.getStore()
    if (!client) throw new Error('db.query anropades utan lagkontext. Använd adminDb i konto-/adminfunktioner.')
    const result = await client.query(text, params)
    return { data: result.rows as T[] }
  },
}

/**
 * Databasåtkomst UTAN RLS, som tabellägaren. Bara för funktioner med
 * access 'user', 'admin' eller 'superadmin', som själva kontrollerar behörighet
 * och alltid filtrerar på req.squad / req.user.
 */
export const adminDb = {
  async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<{ data: T[] }> {
    const result = await pool().query(text, params)
    return { data: result.rows as T[] }
  },
}
