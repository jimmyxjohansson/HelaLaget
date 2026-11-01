'use client'

import { Clock, Gauge, Users } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import { INTENSITY_COLOR, LEVEL_COLOR, categoryColor, formatLabel, playersText } from '../../utils/drills'

export function CategoryChip({ name, className }: { name: string; className?: string }) {
  const c = categoryColor(name)
  return (
    <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', className)}
      style={{ backgroundColor: `${c}1f`, color: c }}>
      {name}
    </span>
  )
}

export function FormatChip({ value }: { value: string }) {
  return <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">{formatLabel(value)}</span>
}

export function LevelDot({ level }: { level: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: LEVEL_COLOR[level] ?? '#9ca3af' }} />
}

/** Tid, antal spelare och intensitet på en rad. */
export function DrillFacts({ minutes, min, max, intensity, className }: { minutes: number | null; min: number | null; max: number | null; intensity: string | null; className?: string }) {
  const players = playersText(min, max)
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
      {minutes ? <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{minutes} min</span> : null}
      {players && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{players}</span>}
      {intensity && (
        <span className="flex items-center gap-1">
          <Gauge className="h-3.5 w-3.5" />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INTENSITY_COLOR[intensity] }} />
          {intensity}
        </span>
      )}
    </div>
  )
}
