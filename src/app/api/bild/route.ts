import { NextResponse, type NextRequest } from 'next/server'
import { getUser } from '@/server/auth'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024

/** Värdnamn som inte ska kunna nås via proxyn (lokala och interna adresser). */
function blockedHost(host: string) {
  return (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.includes(':') // IPv6-literaler
  )
}

/**
 * Hämtar en bild (t.ex. motståndarens logga) åt webbläsaren, så att den kan
 * ritas in i planeringens översiktsbild även när bildservern saknar CORS.
 * Bara för inloggade, bara http(s) och bara bilder.
 */
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Du är inte inloggad.' }, { status: 401 })

  let url: URL
  try {
    url = new URL(request.nextUrl.searchParams.get('url') ?? '')
  } catch {
    return NextResponse.json({ error: 'Ogiltig adress.' }, { status: 400 })
  }
  if (!/^https?:$/.test(url.protocol) || blockedHost(url.hostname)) {
    return NextResponse.json({ error: 'Adressen är inte tillåten.' }, { status: 400 })
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'follow' })
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!res.ok || !type.startsWith('image/')) {
      return NextResponse.json({ error: 'Ingen bild.' }, { status: 404 })
    }
    const body = await res.arrayBuffer()
    if (body.byteLength > MAX_BYTES) return NextResponse.json({ error: 'Bilden är för stor.' }, { status: 413 })
    return new NextResponse(body, {
      headers: { 'content-type': type, 'cache-control': 'private, max-age=86400' },
    })
  } catch {
    return NextResponse.json({ error: 'Kunde inte hämta bilden.' }, { status: 502 })
  }
}
