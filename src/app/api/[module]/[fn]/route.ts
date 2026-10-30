import { NextResponse, type NextRequest } from 'next/server'
import { functions } from '@/server/registry'
import { getUser } from '@/server/auth'
import { AccessError, getDefaultSquadId, getSquadAccess, isSuperadmin } from '@/server/access'
import { withSquadContext } from '@/server/db'
import { redactForViewer } from '@/server/redact'
import { ROLE_RANK, type SquadAccess, type SquadRole } from '@/server/types'
import { SQUAD_COOKIE } from '@/lib/squad-cookie'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ module: string; fn: string }> }

const ROLE_ERROR: Record<SquadRole, string> = {
  viewer: 'Du har inte åtkomst till det här laget.',
  leader: 'Du har bara läsbehörighet i det här laget.',
  admin: 'Det här kräver adminbehörighet i laget.',
}

/**
 * Alla backend-funktioner nås via POST /api/<modul>/<funktion> med parametrarna
 * som JSON. Varje anrop kräver en inloggad användare. Lagets funktioner körs
 * för laget i cookien hl_squad, efter kontroll av användarens roll där.
 */
export async function POST(request: NextRequest, context: Context) {
  const { module, fn } = await context.params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Du är inte inloggad.' }, { status: 401 })
  }

  const entry = functions[`${module}/${fn}`]
  if (!entry) {
    return NextResponse.json({ error: `Okänd funktion: ${module}/${fn}` }, { status: 404 })
  }

  let params: unknown = {}
  try {
    params = (await request.json()) ?? {}
  } catch {
    // Tom body betyder inga parametrar.
  }

  try {
    // Funktioner utan lag: konto, gå med i lag, superadmin.
    if (entry.access === 'user' || entry.access === 'superadmin') {
      if (entry.access === 'superadmin' && !(await isSuperadmin(user.id))) {
        throw new AccessError('Det här kräver superadminbehörighet.')
      }
      return NextResponse.json((await entry.handler({ params, user })) ?? null)
    }

    // Lagets funktioner: hitta valt lag och kontrollera rollen.
    const requested = Number(request.cookies.get(SQUAD_COOKIE)?.value) || null
    let squad: SquadAccess | null = requested ? await getSquadAccess(user.id, requested) : null
    if (!squad) {
      const fallback = await getDefaultSquadId(user.id)
      squad = fallback ? await getSquadAccess(user.id, fallback) : null
    }
    if (!squad) {
      return NextResponse.json(
        { error: 'Du är inte med i något lag ännu.', code: 'NO_SQUAD' },
        { status: 409 },
      )
    }
    if (ROLE_RANK[squad.role] < ROLE_RANK[entry.access]) {
      throw new AccessError(ROLE_ERROR[entry.access])
    }

    const req = { params, user, squad }
    let result =
      entry.access === 'admin'
        ? await entry.handler(req)
        : await withSquadContext({ userId: user.id, squadId: squad.squadId }, () => entry.handler(req))
    if (squad.role === 'viewer') result = redactForViewer(result)

    const response = NextResponse.json(result ?? null)
    if (squad.squadId !== requested) {
      response.cookies.set(SQUAD_COOKIE, String(squad.squadId), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }
    return response
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    // 42501 = RLS-regel eller rättighet i databasen stoppade anropet
    if ((e as { code?: string })?.code === '42501') {
      return NextResponse.json({ error: 'Du har inte behörighet att ändra det här.' }, { status: 403 })
    }
    console.error(`[api] ${module}/${fn} misslyckades`, e)
    const message = e instanceof Error ? e.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
