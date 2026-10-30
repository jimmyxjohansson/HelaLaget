// Skapar nycklarna (VAPID) som push-notiserna signeras med.
//
//   node scripts/generate-vapid-keys.mjs
//
// Lägg in de två raderna som skrivs ut i Vercel → Settings → Environment
// Variables (Production och Preview) och gör en ny deploy. Kör bara en gång:
// byts nycklarna måste alla slå på notiserna igen.
import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pub = publicKey.export({ format: 'jwk' })
const priv = privateKey.export({ format: 'jwk' })
const b64 = (s) => Buffer.from(s, 'base64url')
// Publik nyckel i okomprimerat format: 0x04 || x || y
const rawPublic = Buffer.concat([Buffer.from([4]), b64(pub.x), b64(pub.y)]).toString('base64url')

console.log('Lägg in i Vercel (Settings → Environment Variables):\n')
console.log(`VAPID_PUBLIC_KEY=${rawPublic}`)
console.log(`VAPID_PRIVATE_KEY=${priv.d}`)
console.log('\nDen privata nyckeln är hemlig: lägg den inte i Git eller i chatten.')
