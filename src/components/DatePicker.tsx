'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../lib/shadcn/popover'
import { cn } from '../lib/shadcn/utils'
import { MONTHS, WEEKDAYS_SHORT, monthWeeks, parseIso, todayIso, weekdayName } from '../utils/calendar'

type Props = {
  /** ÅÅÅÅ-MM-DD (längre värden kortas), '' eller null = inget datum */
  value: string | null | undefined
  onChange: (value: string) => void
  id?: string
  className?: string
  placeholder?: string
  disabled?: boolean
  /** Visa knappen Rensa (standard: ja) */
  clearable?: boolean
  /** År i årsväljaren (standard: 30 år bakåt till 3 år framåt) */
  fromYear?: number
  toYear?: number
}

/**
 * Datumväljare med svensk kalender: veckan börjar på måndag, veckonummer och
 * datum som ÅÅÅÅ-MM-DD, oavsett telefonens språkinställning.
 */
export default function DatePicker({
  value,
  onChange,
  id,
  className,
  placeholder = 'Välj datum',
  disabled,
  clearable = true,
  fromYear,
  toYear,
}: Props) {
  const iso = value ? value.slice(0, 10) : ''
  const selected = parseIso(iso)
  const today = todayIso()
  const t = parseIso(today)!
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => ({ y: (selected ?? t).y, m: (selected ?? t).m }))

  // Öppnas väljaren visas månaden med valt datum (eller dagens)
  useEffect(() => {
    if (open) setView({ y: (selected ?? t).y, m: (selected ?? t).m })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const firstYear = Math.min(fromYear ?? t.y - 30, view.y, selected?.y ?? view.y)
  const lastYear = Math.max(toYear ?? t.y + 3, view.y, selected?.y ?? view.y)
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i)

  function step(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
    })
  }

  function pick(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          {selected ? (
            <span className="flex-1 truncate tabular-nums">
              {iso} <span className="text-muted-foreground">{weekdayName(iso)}</span>
            </span>
          ) : (
            <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="mb-2 flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Föregående månad" className="rounded-md p-1.5 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <select
            aria-label="Månad"
            value={view.m}
            onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
            className="flex-1 rounded-md bg-transparent px-1 py-1 text-sm font-semibold capitalize hover:bg-muted focus:outline-none"
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="År"
            value={view.y}
            onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
            className="rounded-md bg-transparent px-1 py-1 text-sm font-semibold tabular-nums hover:bg-muted focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => step(1)} aria-label="Nästa månad" className="rounded-md p-1.5 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <table className="border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="w-7 pb-1 font-normal" title="Vecka">v</th>
              {WEEKDAYS_SHORT.map((d) => (
                <th key={d} className="w-9 pb-1 font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthWeeks(view.y, view.m).map(({ week, days }) => (
              <tr key={days[0].iso}>
                <td className="text-xs tabular-nums text-muted-foreground">{week}</td>
                {days.map((d) => {
                  const isSelected = d.iso === iso
                  const isToday = d.iso === today
                  return (
                    <td key={d.iso} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => pick(d.iso)}
                        aria-label={d.iso}
                        aria-pressed={isSelected}
                        className={cn(
                          'h-8 w-8 rounded-md tabular-nums transition-colors',
                          isSelected
                            ? 'bg-primary font-semibold text-primary-foreground'
                            : d.inMonth
                              ? 'hover:bg-muted'
                              : 'text-muted-foreground/50 hover:bg-muted',
                          isToday && !isSelected && 'font-semibold ring-1 ring-primary',
                        )}
                      >
                        {d.day}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 flex justify-between gap-2">
          <button type="button" onClick={() => pick(today)} className="rounded-md px-2 py-1 text-sm text-primary hover:bg-muted">
            Idag
          </button>
          {clearable && iso && (
            <button type="button" onClick={() => pick('')} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted">
              Rensa
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
