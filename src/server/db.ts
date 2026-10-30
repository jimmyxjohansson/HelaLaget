import 'server-only'
import { Pool, types } from 'pg'

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

/** Ersätter Retools `retoolDb`. Samma anrop: db.query<T>(sql, params) → { data: T[] }. */
export const db = {
  async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<{ data: T[] }> {
    const result = await pool().query(text, params)
    return { data: result.rows as T[] }
  },
}
