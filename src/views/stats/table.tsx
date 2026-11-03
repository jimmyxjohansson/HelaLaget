'use client'

import { canEdit } from '../../lib/squad-store'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/shadcn/utils'
import { SortHead, sortRows, type SortState } from '../planning/shared'

export type Column<T> = {
  key: string
  label: string
  title?: string
  /** Värdet som sorteras på (och visas om render saknas). */
  value: (row: T) => number | string | null
  render?: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** Första sorteringsriktning: siffror börjar oftast med högst. */
  firstDir?: 'asc' | 'desc'
  className?: string
  /** Summeringsrad längst ner (valfri). */
  total?: ReactNode
}

/**
 * Sorterbar tabell. Första kolumnen (namnet) står still när man scrollar i
 * sidled på mobilen.
 */
export function DataTable<T extends { shortname: string | null }>({
  rows,
  columns,
  initialSort,
  rowKey,
  onRowClick,
  empty = 'Inget att visa.',
  footerLabel,
}: {
  rows: T[]
  columns: Column<T>[]
  initialSort: SortState<string>
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  empty?: string
  footerLabel?: string
}) {
  // Rank (Nivå per spelare) visas inte för Spelare och Anhörig
  if (!canEdit()) columns = columns.filter((c) => c.key !== 'rank')
  const [sort, setSort] = useState<SortState<string>>(initialSort)
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key)
    return col ? sortRows(rows, sort, (r) => col.value(r)) : rows
  }, [rows, sort, columns])
  const hasTotals = columns.some((c) => c.total !== undefined)

  if (rows.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                className={cn(
                  'whitespace-nowrap border-b border-border bg-card px-2 py-2 font-normal first:pl-4 last:pr-4',
                  i === 0 && 'sticky left-0 z-10',
                  c.className,
                )}
              >
                <SortHead
                  label={c.label}
                  k={c.key}
                  sort={sort}
                  onSort={setSort}
                  title={c.title}
                  firstDir={c.firstDir ?? (c.align === 'right' ? 'desc' : 'asc')}
                  className={c.align === 'right' ? 'ml-auto' : ''}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn('group', onRowClick && 'cursor-pointer')}
            >
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap border-b border-border bg-card px-2 py-2 first:pl-4 last:pr-4 group-hover:bg-muted/60',
                    c.align === 'right' && 'text-right tabular-nums',
                    i === 0 && 'sticky left-0 z-[1]',
                    c.className,
                  )}
                >
                  {c.render ? c.render(r) : (c.value(r) ?? '–')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasTotals && (
          <tfoot>
            <tr className="font-semibold">
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap bg-muted/60 px-2 py-2 first:pl-4 last:pr-4',
                    c.align === 'right' && 'text-right tabular-nums',
                    i === 0 && 'sticky left-0 z-[1]',
                    c.className,
                  )}
                >
                  {i === 0 ? (footerLabel ?? 'Totalt') : c.total}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/** Valbar knapp i filterraden. */
export function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      {children}
    </button>
  )
}

/** Två eller fler lägen bredvid varandra. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('rounded-md px-3 py-1 text-sm font-medium', value === o.value ? 'bg-background shadow-sm' : 'text-muted-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

export function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : null
}

export function pctClass(p: number | null) {
  if (p == null) return 'text-muted-foreground'
  if (p >= 75) return 'text-green-600 dark:text-green-400'
  if (p >= 50) return 'text-orange-500'
  return 'text-red-500'
}

export const LEVEL_ORDER = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X', '–']
export const TYPE_ORDER = ['Serie', 'Träning', 'Cup', 'Övrigt']
export function orderBy(order: string[]) {
  return (a: string, b: string) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'sv')
  }
}
