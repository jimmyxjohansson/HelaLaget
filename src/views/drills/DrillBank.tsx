'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Download, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useGetDrills, useImportStarterDrills } from '../../hooks/backend/drills'
import { usePersistentState } from '../../hooks/usePersistentState'
import SquadLogo from '../../components/SquadLogo'
import DrillDiagram from '../../components/drills/DrillDiagram'
import { canEdit } from '../../lib/squad-store'
import { cn } from '../../lib/shadcn/utils'
import { isDiagram } from '../../utils/diagram'
import { CATEGORIES, GAME_FORMATS, INTENSITIES, INTENSITY_COLOR } from '../../utils/drills'
import { CategoryChip, DrillFacts, FormatChip } from './shared'

export type DrillListItem = NonNullable<ReturnType<typeof useGetDrills>['data']>[number]

/** Filtrering av övningar, delad med väljaren i träningsplanen. */
export function useDrillFilters(prefix: string) {
  const [search, setSearch] = useState('')
  const [formats, setFormats] = usePersistentState<string[]>(`${prefix}-formats`, [])
  const [categories, setCategories] = usePersistentState<string[]>(`${prefix}-cats`, [])
  const [intensity, setIntensity] = usePersistentState<string[]>(`${prefix}-int`, [])
  return { search, setSearch, formats, setFormats, categories, setCategories, intensity, setIntensity }
}

export function filterDrills(list: DrillListItem[], f: ReturnType<typeof useDrillFilters>) {
  const q = f.search.trim().toLowerCase()
  return list.filter((d) => {
    if (q && !`${d.name} ${d.summary ?? ''} ${d.categories.join(' ')}`.toLowerCase().includes(q)) return false
    if (f.formats.length && !d.gameFormats.some((g) => f.formats.includes(g))) return false
    if (f.categories.length && !d.categories.some((c) => f.categories.includes(c))) return false
    if (f.intensity.length && !f.intensity.includes(d.intensity ?? '')) return false
    return true
  })
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

function Chip({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
      style={on && color ? { backgroundColor: color, color: '#fff' } : undefined}>
      {children}
    </button>
  )
}

/** Filterraderna: spelform, kategori och intensitet. */
export function DrillFilters({ f, list, open = true }: { f: ReturnType<typeof useDrillFilters>; list: DrillListItem[]; open?: boolean }) {
  // Egna kategorier som används i banken visas efter de föreslagna
  const custom = [...new Set(list.flatMap((d) => d.categories))].filter((c) => !CATEGORIES.some((x) => x.name === c)).sort()
  const cats = [...CATEGORIES.filter((c) => list.length === 0 || list.some((d) => d.categories.includes(c.name))), ...custom.map((name) => ({ name, color: '#6b7280' }))]
  return (
    <div className={cn('flex-col gap-2', open ? 'flex' : 'hidden md:flex')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-muted-foreground">Spelform</span>
        {GAME_FORMATS.map((g) => (
          <Chip key={g.value} on={f.formats.includes(g.value)} onClick={() => f.setFormats(toggle(f.formats, g.value))}>{g.label}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-muted-foreground">Kategori</span>
        {cats.map((c) => (
          <Chip key={c.name} on={f.categories.includes(c.name)} color={c.color} onClick={() => f.setCategories(toggle(f.categories, c.name))}>{c.name}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-muted-foreground">Intensitet</span>
        {INTENSITIES.map((i) => (
          <Chip key={i} on={f.intensity.includes(i)} color={INTENSITY_COLOR[i]} onClick={() => f.setIntensity(toggle(f.intensity, i))}>{i}</Chip>
        ))}
        {(f.formats.length > 0 || f.categories.length > 0 || f.intensity.length > 0) && (
          <button type="button" onClick={() => { f.setFormats([]); f.setCategories([]); f.setIntensity([]) }}
            className="ml-1 text-xs text-primary underline-offset-4 hover:underline">
            Rensa filter
          </button>
        )}
      </div>
    </div>
  )
}

export function DrillCard({ d, onClick, href, compact }: { d: DrillListItem; onClick?: () => void; href?: string; compact?: boolean }) {
  const body = (
    <>
      <div className="aspect-[3/2] w-full overflow-hidden bg-[#2f8f46]">
        {isDiagram(d.diagram) ? (
          <DrillDiagram diagram={d.diagram} className="h-full w-full" title={d.name} />
        ) : (
          <div className="flex h-full items-center justify-center text-white/70"><BookOpen className="h-8 w-8" /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{d.name}</h3>
        {!compact && d.summary && <p className="line-clamp-2 text-xs text-muted-foreground">{d.summary}</p>}
        <DrillFacts minutes={d.durationMinutes} min={d.playersMin} max={d.playersMax} intensity={d.intensity} />
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {d.gameFormats.map((g) => <FormatChip key={g} value={g} />)}
          {d.categories.slice(0, compact ? 2 : 4).map((c) => <CategoryChip key={c} name={c} />)}
        </div>
      </div>
    </>
  )
  const cls = 'flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-md'
  return href ? <Link href={href} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>
}

/** Föreningens övningsbank. */
export default function DrillBank() {
  const router = useRouter()
  const drills = useGetDrills()
  const importer = useImportStarterDrills()
  const f = useDrillFilters('hl-drills')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const editor = canEdit()

  useEffect(() => {
    drills.trigger().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const list = drills.data ?? []
  const shown = useMemo(() => filterDrills(list, f), [list, f])

  async function importStarter() {
    setMessage(null)
    try {
      const r = await importer.trigger()
      setMessage(r.added ? `${r.added} övningar lades till.` : 'Startpaketets övningar finns redan i banken.')
      await drills.trigger()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-3 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SquadLogo />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Övningsbank</h1>
              <p className="text-sm text-team-accent/70">Föreningens övningar{list.length ? ` · ${list.length} st` : ''}</p>
            </div>
          </div>
          {editor && (
            <button type="button" onClick={() => router.push('/ovningar/ny')}
              className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-2 text-sm font-medium hover:bg-primary-foreground/30">
              <Plus className="h-4 w-4" /> Ny övning
            </button>
          )}
        </div>
      </div>

      <div className="z-10 flex flex-col gap-2 border-b border-border bg-background px-4 py-3 md:sticky md:top-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Sök övning"
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}
            className={cn('flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm md:hidden', filtersOpen && 'bg-muted')}>
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
          <span className="ml-auto hidden text-xs text-muted-foreground md:inline">{shown.length} av {list.length}</span>
        </div>
        <DrillFilters f={f} list={list} open={filtersOpen} />
      </div>

      <div className="p-3 md:p-4">
        {message && <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>}
        {!drills.data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Övningsbanken är tom</h2>
            <p className="text-sm text-muted-foreground">
              Börja med startpaketet: 80 övningar för 3 mot 3 till 11 mot 11 med ritningar och progression i tre nivåer. Ni kan ändra och lägga till egna efteråt.
            </p>
            {editor && (
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={importStarter} disabled={importer.loading}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                  {importer.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Hämta startpaketet
                </button>
                <button type="button" onClick={() => router.push('/ovningar/ny')} className="rounded-md border border-border px-4 py-2 text-sm font-medium">
                  Skapa egen övning
                </button>
              </div>
            )}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Inga övningar matchar filtret.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((d) => <DrillCard key={d.id} d={d} href={`/ovningar/${d.id}`} />)}
          </div>
        )}
        {editor && list.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={importStarter} disabled={importer.loading}
              className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-60"
              title="Lägger till startpaketets övningar som saknas i banken">
              {importer.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Hämta startpaketets övningar som saknas
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
