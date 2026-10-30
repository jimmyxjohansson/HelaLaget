import { NextResponse, type NextRequest } from 'next/server'
import { functions } from '@/server/registry'
import { getUser } from '@/server/auth'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ module: string; fn: string }> }

/**
 * Alla backend-funktioner nås via POST /api/<modul>/<funktion> med parametrarna
 * som JSON. Varje anrop kräver en inloggad användare.
 */
export async function POST(request: NextRequest, context: Context) {
  const { module, fn } = await context.params

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Du är inte inloggad.' }, { status: 401 })
  }

  const handler = functions[`${module}/${fn}`]
  if (!handler) {
    return NextResponse.json({ error: `Okänd funktion: ${module}/${fn}` }, { status: 404 })
  }

  let params: unknown = {}
  try {
    params = await request.json()
  } catch {
    // Tom body betyder inga parametrar.
  }

  try {
    const result = await handler({ params: params ?? {}, user })
    return NextResponse.json(result ?? null)
  } catch (e) {
    console.error(`[api] ${module}/${fn} misslyckades`, e)
    const message = e instanceof Error ? e.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
