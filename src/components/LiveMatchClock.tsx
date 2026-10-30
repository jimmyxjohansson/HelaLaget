'use client'

import { useEffect, useState } from 'react'
import { clockSeconds, formatClock, type RunningClock } from '../utils/matchClock'

/** Tickande matchklocka, t.ex. i matchens sidhuvud. */
export default function LiveMatchClock({ clock, periods }: { clock: RunningClock; periods: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-team-accent tabular-nums">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      {formatClock(clockSeconds(clock, now))}
      {periods > 1 && <span className="font-medium text-team-accent/70">· P{clock.period}</span>}
    </span>
  )
}
