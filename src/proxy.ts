import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Körs före varje request (Next.js 16 kallar detta "proxy", tidigare
 * "middleware"). Förnyar Supabase-sessionen och skickar utloggade
 * besökare till /login. API-routes svarar 401 i stället för att omdirigera.
 */
export async function proxy(request: NextRequest) {
  // Den dagliga körningen från Vercel Cron har ingen inloggning; routen kräver CRON_SECRET.
  if (request.nextUrl.pathname.startsWith('/api/cron/')) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
      !supabaseKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ].filter(Boolean)
    return new NextResponse(
      `Appen är inte konfigurerad: miljövariabeln ${missing.join(' och ')} saknas.\n\n` +
        'Lägg in den i Vercel under Settings → Environment Variables och gör sedan en ny deploy ' +
        '(Deployments → … → Redeploy). NEXT_PUBLIC_-variabler läses in när appen byggs.',
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    // Går Supabase inte att nå (fel URL eller nyckel) behandlas besökaren som utloggad.
    console.error('[proxy] kunde inte kontrollera inloggningen', e)
  }

  const { pathname, search } = request.nextUrl
  const isPublic = pathname === '/login' || pathname === '/registrera'

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Du är inte inloggad.' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (user && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
