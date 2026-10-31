'use client'

import { useEffect, useState } from 'react'
import { Input } from '../lib/shadcn/input'
import { cn } from '../lib/shadcn/utils'

/** Formaterar siffror till ÅÅÅÅ-MM-DD medan man skriver. */
function format(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 4) return d
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
}

function isValidDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 1900
}

/**
 * Datumfält som alltid visar ÅÅÅÅ-MM-DD, oavsett telefonens språkinställning
 * (webbläsarens datumväljare följer annars den, t.ex. MM/DD/ÅÅÅÅ).
 * onChange får ett giltigt datum eller null när fältet töms.
 */
export default function DateTextInput({
  value,
  onChange,
  className,
  id,
}: {
  value: string | null | undefined
  onChange: (value: string | null) => void
  className?: string
  id?: string
}) {
  const external = value ? value.slice(0, 10) : ''
  const [text, setText] = useState(external)

  // Ändras värdet utifrån (t.ex. när spelaren laddas) visas det nya värdet
  useEffect(() => {
    setText(external)
  }, [external])

  const invalid = text.length === 10 && !isValidDate(text)

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="ÅÅÅÅ-MM-DD"
      maxLength={10}
      value={text}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        const next = format(e.target.value)
        setText(next)
        if (next === '') onChange(null)
        else if (isValidDate(next)) onChange(next)
      }}
      onBlur={() => {
        // Ofullständigt eller ogiltigt datum: visa det sparade värdet igen
        if (text !== '' && !isValidDate(text)) setText(external)
      }}
      className={cn('tabular-nums', invalid && 'border-destructive focus-visible:ring-destructive', className)}
    />
  )
}
