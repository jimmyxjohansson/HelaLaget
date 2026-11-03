'use client'

import { Lock } from 'lucide-react'
import { useRouter } from '../lib/nav'

/** Visas för Spelare och Anhörig på sidor som bara är för ledare. */
export default function LeadersOnly({ what }: { what: string }) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{what} är bara för lagets ledare.</p>
      <button onClick={() => router.back()} className="text-sm font-medium text-primary">Tillbaka</button>
    </div>
  )
}
