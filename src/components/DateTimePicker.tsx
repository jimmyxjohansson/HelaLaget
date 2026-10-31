'use client'

import { useEffect, useState } from 'react'
import DatePicker from './DatePicker'
import TimeInput from './TimeInput'
import { isValidTime, parseIso } from '../utils/calendar'

/**
 * Datum och klockslag. Värdet har samma form som en datetime-local-ruta,
 * ÅÅÅÅ-MM-DDTTT:MM, och är '' tills både datum och tid är ifyllda.
 */
export default function DateTimePicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const [date, setDate] = useState(() => value.slice(0, 10))
  const [time, setTime] = useState(() => value.slice(11, 16))

  // Värdet utifrån (t.ex. när en träning laddas) visas
  useEffect(() => {
    if (value) {
      setDate(value.slice(0, 10))
      setTime(value.slice(11, 16))
    }
  }, [value])

  function emit(d: string, t: string) {
    onChange(parseIso(d) && isValidTime(t) ? `${d}T${t}` : '')
  }

  return (
    <div className={`grid grid-cols-[1fr_7.5rem] gap-2 ${className ?? ''}`}>
      <DatePicker
        value={date}
        clearable={false}
        onChange={(d) => {
          setDate(d)
          emit(d, time)
        }}
      />
      <TimeInput
        value={time}
        onChange={(t) => {
          setTime(t)
          emit(date, t)
        }}
      />
    </div>
  )
}
