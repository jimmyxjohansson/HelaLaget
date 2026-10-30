import { NextResponse, type NextRequest } from 'next/server'
import { squadsWithFeed, syncSquad } from '@/server/svenskalag/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daglig hämtning från Svenskalag för alla lag med kalenderlänk.
 * Anropas av Vercel Cron (se vercel.json), som skickar CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Obehörig.' }, { status: 401 })
  }

  const results: Record<number, unknown> = {}
  for (const squadId of await squadsWithFeed()) {
    try {
      results[squadId] = await syncSquad(squadId)
    } catch (e) {
      // Felet sparas på laget och visas på sidan Svenskalag; fortsätt med nästa lag.
      results[squadId] = { error: e instanceof Error ? e.message : 'Okänt fel' }
    }
  }
  return NextResponse.json({ ok: true, results })
}
