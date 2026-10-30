'use client'

import { useState } from 'react'
import { ownTeamLogoUrl, ownTeamName } from '../utils/constants'
import { cn } from '../lib/shadcn/utils'

/** Valt lags logga i sidhuvudet. Döljs om bilden inte går att ladda. */
export default function SquadLogo({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ownTeamLogoUrl()}
      alt={ownTeamName()}
      onError={() => setFailed(true)}
      className={cn('w-10 h-10 object-contain flex-shrink-0', className)}
    />
  )
}
