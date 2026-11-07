'use client'

import { useState } from 'react'
import { Check, UserRound, Users } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'

export type LeaderOption = { id: number; name: string; /** Anmäld eller närvarande på passet */ here: boolean }

/** "Anna, Erik och en annan vuxen (Pelle)" */
export function holdersText(ids: number[], otherAdult: string | null, nameOf: (id: number) => string | undefined) {
  const names = ids.map(nameOf).filter((n): n is string => !!n)
  if (otherAdult != null) names.push(otherAdult ? `${otherAdult} (annan vuxen)` : 'annan vuxen')
  if (names.length === 0) return ''
  const s = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} och ${names[names.length - 1]}`
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Välj ledare som håller i en övning (eller ambulerar), och om en annan vuxen gör det.
 * Ledarna på passet står först.
 */
export default function LeaderPicker({ leaders, value, otherAdult, onChange, label, allowOther = true }: {
  leaders: LeaderOption[]
  value: number[]
  otherAdult?: string | null
  onChange: (ids: number[], otherAdult: string | null) => void
  label: string
  allowOther?: boolean
}) {
  const [open, setOpen] = useState(false)
  const other = otherAdult ?? null
  const nameOf = (id: number) => leaders.find((l) => l.id === id)?.name
  const text = holdersText(value, other, nameOf)
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id], other)
  const sorted = [...leaders].sort((a, b) => Number(b.here) - Number(a.here) || a.name.localeCompare(b.name, 'sv'))

  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className={cn('flex min-h-8 items-center gap-1.5 self-start rounded-md border px-2 py-1 text-left text-xs',
          text ? 'border-border' : 'border-dashed border-border text-muted-foreground')}>
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span><span className="text-muted-foreground">{label}:</span> {text || 'Välj'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2">
          {leaders.length === 0 ? (
            <p className="text-xs text-muted-foreground">Laget har inga ledare registrerade.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sorted.map((l) => {
                const on = value.includes(l.id)
                return (
                  <button key={l.id} type="button" onClick={() => toggle(l.id)} aria-pressed={on}
                    className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted')}>
                    {on && <Check className="h-3 w-3" />}
                    {l.name}
                    {l.here && !on && <span className="h-1.5 w-1.5 rounded-full bg-green-600" title="På passet" />}
                  </button>
                )
              })}
            </div>
          )}
          {allowOther && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onChange(value, other == null ? '' : null)} aria-pressed={other != null}
                className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
                  other != null ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted')}>
                {other != null ? <Check className="h-3 w-3" /> : <UserRound className="h-3 w-3" />} Annan vuxen
              </button>
              {other != null && (
                <input value={other} onChange={(e) => onChange(value, e.target.value)} placeholder="Namn (valfritt)" maxLength={60}
                  className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs" />
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Grön prick = anmäld eller närvarande på passet.</p>
        </div>
      )}
    </div>
  )
}
