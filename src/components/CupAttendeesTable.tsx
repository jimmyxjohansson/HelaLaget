'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Users } from 'lucide-react'
import { useGetCupAttendees } from '../hooks/backend/cups'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../lib/shadcn/table'
import { cn } from '../lib/shadcn/utils'

interface Attendee {
  id: number
  number: number | null
  firstname: string | null
  lastname: string | null
  birthdate: string | null
}

type SortKey = 'number' | 'name' | 'birthdate'
type SortDir = 'asc' | 'desc'

function fullName(a: Attendee): string {
  return `${a.firstname ?? ''} ${a.lastname ?? ''}`.trim()
}

export function CupAttendeesTable({ cupId }: { cupId: number }) {
  const { data, loading, trigger } = useGetCupAttendees()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => { trigger({ id: cupId }) }, [cupId])

  const attendees = (data as unknown as Attendee[] | undefined) ?? []

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const list = [...attendees]
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortKey === 'number') {
        const an = a.number ?? Number.POSITIVE_INFINITY
        const bn = b.number ?? Number.POSITIVE_INFINITY
        return (an - bn) * dir
      }
      if (sortKey === 'birthdate') {
        return (a.birthdate ?? '').localeCompare(b.birthdate ?? '') * dir
      }
      return fullName(a).localeCompare(fullName(b), 'sv') * dir
    })
    return list
  }, [attendees, sortKey, sortDir])

  if (loading && attendees.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="bg-card rounded-xl h-10 animate-pulse" />
        <div className="bg-card rounded-xl h-10 animate-pulse" />
        <div className="bg-card rounded-xl h-10 animate-pulse" />
      </div>
    )
  }

  if (attendees.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">Inga spelare med status "Kommer"</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Users className="w-3.5 h-3.5" />
        {attendees.length} spelare kommer
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Nr" active={sortKey === 'number'} dir={sortDir} onClick={() => toggleSort('number')} className="w-14" />
              <SortHeader label="Namn" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
              <SortHeader label="Födelsedatum" active={sortKey === 'birthdate'} dir={sortDir} onClick={() => toggleSort('birthdate')} className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(a => (
              <TableRow key={a.id}>
                <TableCell className="tabular-nums text-muted-foreground">{a.number ?? '–'}</TableCell>
                <TableCell className="font-medium text-foreground">{fullName(a) || '–'}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{a.birthdate ?? '–'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function SortHeader({
  label, active, dir, onClick, className,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  className?: string
}) {
  return (
    <TableHead className={className}>
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:text-foreground',
          active ? 'text-foreground' : 'text-muted-foreground',
          className?.includes('text-right') && 'flex-row-reverse',
        )}
      >
        {label}
        {active
          ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 opacity-50" />}
      </button>
    </TableHead>
  )
}
