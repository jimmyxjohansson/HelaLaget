'use client'

import { useEffect, useMemo, useState } from 'react'
import { clockSeconds, formatClock, runningClock, type StoredClock } from '../utils/matchClock'

export type LiveMatch = StoredClock & {
  live?: boolean
  ourgoals?: number | null
  theirgoals?: number | null
  periods?: number | null
}

/**
 * Liveresultat för en pågående match: röd LIVE-markering, ställningen och
 * matchklockan som tickar (eller "Pågår" när klockan står, t.ex. i paus).
 */
export default function LiveScore({ m, size = 'md' }: { m: LiveMatch; size?: 'sm' | 'md' }) {
  // Klockan räknas om bara när nya värden hämtats (rättar för fel klocka i telefonen)
  const clock = useMemo(
    () => runningClock(m),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.server_now, m.clock_started_at, m.clock_period, m.clock_offset_minutes],
  )
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!clock) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [clock])
  const periods = m.periods && m.periods > 0 ? m.periods : 1

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className={`font-bold tabular-nums text-foreground ${size === 'md' ? 'text-lg leading-none' : 'text-base leading-none'}`}>
        {m.ourgoals ?? 0}–{m.theirgoals ?? 0}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white tabular-nums">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        {clock ? (
          <>
            {formatClock(clockSeconds(clock, now))}
            {periods > 1 && <span className="font-medium opacity-80">P{clock.period}</span>}
          </>
        ) : (
          'Live'
        )}
      </span>
    </span>
  )
}

/** Hämta om listan var 20:e sekund så länge någon match pågår och sidan syns. */
export function useLiveRefresh(active: boolean, refresh: () => void, ms = 20000) {
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, ms)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ms])
}
