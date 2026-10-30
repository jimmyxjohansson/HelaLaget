// Flyttar spelarbilder och lagloggor från Retool Storage till Supabase Storage
// och uppdaterar länkarna i databasen (players.img och teams.imgurl).
//
// Kör från projektmappen efter `npm install`:
//   node --env-file=.env.local scripts/migrate-images.mjs           ← torrkörning, ändrar inget
//   node --env-file=.env.local scripts/migrate-images.mjs --apply   ← flyttar på riktigt
//
// Kräver i .env.local: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL och
// SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role).
// Service role-nyckeln ger full åtkomst – lägg den ALDRIG i Vercel eller i Git.
//
// Skriptet går att köra flera gånger: redan flyttade bilder hoppas över.
import { createHash } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const env = process.env
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = env.NEXT_PUBLIC_STORAGE_BUCKET || 'images'
const OWN_LOGO = env.NEXT_PUBLIC_OWN_TEAM_LOGO_URL ||
  'https://skabersjoifp13.retool.com/api/file/1b186491-0085-4624-810b-a243328c9160'

const TARGETS = [
  { table: 'players', column: 'img', folder: 'players' },
  { table: 'teams', column: 'imgurl', folder: 'teams' },
]

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg', 'image/heic': '.heic' }

const isRetoolUrl = (url) => /^https:\/\/[^/]*retool\.com\//i.test(url)

function requireEnv() {
  const missing = ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !env[k])
  if (missing.length) {
    console.error(`Saknar miljövariabler: ${missing.join(', ')}. Se .env.example.`)
    process.exit(1)
  }
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`nedladdning gav HTTP ${res.status}`)
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  // Retool svarar med en HTML-sida om filen inte är publik – ta inte med den.
  if (!type.startsWith('image/')) throw new Error(`inte en bild (content-type: ${type || 'saknas'})`)
  return { bytes: new Uint8Array(await res.arrayBuffer()), type }
}

let storage = null

/** Supabase-klient med service role/secret-nyckeln (fungerar med både sb_secret_ och äldre eyJ-nycklar). */
function storageClient() {
  if (!storage) {
    storage = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage
  }
  return storage
}

/** Kontrollera att bucketen finns och att nyckeln ger åtkomst, innan något flyttas. */
async function checkBucket() {
  const { data, error } = await storageClient().getBucket(BUCKET)
  if (error || !data) {
    const hint = /not found/i.test(error?.message ?? '')
      ? `Bucketen "${BUCKET}" finns inte. Kör supabase/setup.sql i Supabase → SQL Editor.`
      : 'Kontrollera SUPABASE_SERVICE_ROLE_KEY (Project Settings → API Keys → Secret key) och NEXT_PUBLIC_SUPABASE_URL i .env.local.'
    throw new Error(`Kommer inte åt Supabase Storage: ${error?.message ?? 'okänt fel'}. ${hint}`)
  }
}

async function upload(path, bytes, type) {
  const { error } = await storageClient().from(BUCKET).upload(path, bytes, { contentType: type, upsert: true })
  if (error) throw new Error(`uppladdning misslyckades: ${error.message}`)
  return storageClient().from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Samma Retool-länk ger alltid samma filnamn, så omkörningar skriver över i stället för att duplicera. */
function storagePath(folder, url, type) {
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 16)
  return `${folder}/retool-${hash}${EXT[type] || ''}`
}

async function migrateUrl(url, folder) {
  const { bytes, type } = await download(url)
  const newUrl = await upload(storagePath(folder, url, type), bytes, type)
  return { newUrl, size: bytes.length }
}

async function main() {
  requireEnv()
  const client = new pg.Client({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false },
  })
  await client.connect()

  if (apply) await checkBucket()
  console.log(apply ? 'Flyttar bilder …\n' : 'TORRKÖRNING – inget ändras. Kör med --apply för att flytta.\n')
  const failures = []
  let moved = 0
  let rowsUpdated = 0

  try {
    for (const { table, column, folder } of TARGETS) {
      const { rows } = await client.query(
        `SELECT ${column} AS url, COUNT(*)::int AS n FROM ${table}
         WHERE ${column} IS NOT NULL AND ${column} <> '' GROUP BY ${column} ORDER BY ${column}`,
      )
      const toMove = rows.filter((r) => isRetoolUrl(r.url))
      console.log(`${table}.${column}: ${toMove.length} bild(er) i Retool Storage, ${rows.length - toMove.length} redan utanför Retool`)

      for (const { url, n } of toMove) {
        if (!apply) {
          console.log(`  skulle flytta ${url} (${n} rad${n === 1 ? '' : 'er'})`)
          continue
        }
        try {
          const { newUrl, size } = await migrateUrl(url, folder)
          const res = await client.query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`, [newUrl, url])
          moved++
          rowsUpdated += res.rowCount ?? 0
          console.log(`  ✓ ${url} → ${newUrl} (${Math.round(size / 1024)} kB, ${res.rowCount} ${res.rowCount === 1 ? 'rad' : 'rader'})`)
        } catch (e) {
          failures.push({ url, reason: e.message })
          console.log(`  ✗ ${url}: ${e.message}`)
        }
      }
    }

    console.log('\nLagets egen logga:')
    if (!isRetoolUrl(OWN_LOGO)) {
      console.log(`  redan utanför Retool: ${OWN_LOGO}`)
    } else if (!apply) {
      console.log(`  skulle flytta ${OWN_LOGO}`)
    } else {
      try {
        const { newUrl } = await migrateUrl(OWN_LOGO, 'brand')
        moved++
        console.log(`  ✓ flyttad. Sätt i Vercel och .env.local:\n    NEXT_PUBLIC_OWN_TEAM_LOGO_URL=${newUrl}`)
      } catch (e) {
        failures.push({ url: OWN_LOGO, reason: e.message })
        console.log(`  ✗ ${e.message}`)
      }
    }
  } finally {
    await client.end()
  }

  if (apply) {
    console.log(`\nKlart: ${moved} bild(er) flyttade, ${rowsUpdated} rad(er) uppdaterade, ${failures.length} misslyckades.`)
    if (failures.length) {
      console.log('De misslyckade har kvar sin gamla Retool-länk. Ladda upp dem igen i appen, eller kör skriptet på nytt.')
      process.exitCode = 1
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
