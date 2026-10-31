'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import { formatTimeTyping, isValidTime } from '../utils/calendar'

/**
 * Klockslag som TT:MM i 24-timmarsformat, oavsett telefonens språk (den
 * inbyggda tidsväljaren kan annars visa AM/PM). Kolon läggs in automatiskt.
 * onChange får ett giltigt klockslag eller ''.
 */
export default function TimeInput({
  value,
  onChange,
  id,
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  disabled?: boolean
}) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const invalid = text.length === 5 && !isValidTime(text)

  return (
    <div className={cn('relative', className)}>
      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="TT:MM"
        maxLength={5}
        disabled={disabled}
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const next = formatTimeTyping(e.target.value)
          setText(next)
          if (next === '') onChange('')
          else if (isValidTime(next)) onChange(next)
        }}
        onBlur={() => {
          // "9" eller "930" blir 09:00 / 09:30
          const digits = text.replace(/\D/g, '')
          let fixed = text
          if (digits.length === 1 || digits.length === 2) fixed = `${digits.padStart(2, '0')}:00`
          else if (digits.length === 3) fixed = `0${digits[0]}:${digits.slice(1)}`
          if (fixed !== text && isValidTime(fixed)) {
            setText(fixed)
            onChange(fixed)
          } else if (text !== '' && !isValidTime(text)) setText(value)
        }}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-9 pr-3 text-base tabular-nums shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          invalid && 'border-destructive',
        )}
      />
    </div>
  )
}
