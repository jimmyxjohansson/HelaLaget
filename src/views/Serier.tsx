'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2, ChevronRight, Loader2, Trophy } from 'lucide-react'
import {
  useGetLeagues, useCreateLeague, useUpdateLeague, useDeleteLeague,
} from '../hooks/backend/leagues'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../lib/shadcn/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../lib/shadcn/alert-dialog'

interface League {
  id: number
  name: string
  status: string
  year: number | null
  season: string | null
  level: string | null
  age: string | null
  region: string | null
  match_count: number
  played_count: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  last_date: string | null
}

type StatusFilter = 'Pågående' | 'Avslutade'

export default function Serier() {
  const { data, loading, trigger: fetchLeagues } = useGetLeagues()
  const { trigger: createLeague } = useCreateLeague()
  const { trigger: updateLeague } = useUpdateLeague()
  const { trigger: deleteLeague } = useDeleteLeague()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pågående')
  const [editing, setEditing] = useState<League | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<League | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchLeagues({}) }, [])

  const leagues = data as unknown as League[] | undefined

  const filtered = (leagues ?? []).filter(l => {
    if (statusFilter === 'Pågående' && l.status !== 'Aktiv') return false
    if (statusFilter === 'Avslutade' && l.status !== 'Avslutad') return false
    if (search) {
      return l.name.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  // Sort by year (desc), then season (chronological), then level (asc).
  const SEASON_ORDER: Record<string, number> = { vinter: 0, 'vår': 1, sommar: 2, 'höst': 3 }
  const sorted = [...filtered].sort((a, b) => {
    const yearDiff = (b.year ?? -Infinity) - (a.year ?? -Infinity)
    if (yearDiff !== 0) return yearDiff
    const seasonDiff = (SEASON_ORDER[a.season ?? ''] ?? 99) - (SEASON_ORDER[b.season ?? ''] ?? 99)
    if (seasonDiff !== 0) return seasonDiff
    return (a.level ?? '').localeCompare(b.level ?? '', 'sv')
  })

  const activeCount = (leagues ?? []).filter(l => l.status === 'Aktiv').length

  function openNew() {
    setEditing({
      id: 0, name: '', status: 'Aktiv', year: null, season: null, level: null, age: null, region: null,
      match_count: 0, played_count: 0,
      wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, last_date: null,
    })
    setDialogOpen(true)
  }

  function openEdit(l: League, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(l)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLeague({ id: deleteTarget.id })
      setDeleteTarget(null)
      await fetchLeagues({}, { skipCache: true })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-[#FFCF08] px-4 pt-6 pb-3" style={{ backgroundColor: '#106A37' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Serier</h1>
            <p className="text-[#FFCF08]/70 text-sm">{activeCount} pågående</p>
          </div>
          <button
            onClick={openNew}
            className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
            aria-label="Lägg till serie"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter + search */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex flex-col gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['Pågående', 'Avslutade'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök serie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-3">
        {loading && !leagues ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laddar...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Inga serier hittades.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map(l => (
              <div
                key={l.id}
                onClick={() => router.push(`/serier/${l.id}`)}
                className="bg-card border border-border rounded-xl px-3 py-2.5 flex flex-col gap-2 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                {/* Row 1: icon + name spanning full width */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <p className="flex-1 min-w-0 font-medium text-[14px] truncate">{l.name}</p>
                </div>

                {/* Row 2: details + action buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={l.status === 'Aktiv'
                        ? { backgroundColor: '#2563eb', color: '#fff' }
                        : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                    >
                      {l.status === 'Aktiv' ? 'Pågående' : 'Avslutad'}
                    </span>
                    <span className="text-xs text-muted-foreground">{l.match_count} matcher</span>
                    {l.played_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {l.wins}V {l.draws}O {l.losses}F · {l.goals_for}–{l.goals_against}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => openEdit(l, e)}
                    aria-label="Redigera"
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(l) }}
                    aria-label="Ta bort"
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / edit dialog */}
      {editing && (
        <LeagueDialog
          key={editing.id}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          league={editing}
          onSave={async (values) => {
            if (editing.id === 0) {
              await createLeague(values)
            } else {
              await updateLeague({ id: editing.id, ...values })
            }
            setDialogOpen(false)
            await fetchLeagues({}, { skipCache: true })
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort serie?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {deleteTarget?.name}? Matcher kopplade till serien
              behålls men får ingen serie. Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete() }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function composeName(age: string, region: string, level: string, season: string, year: string): string {
  const prefix = [age.trim(), region.trim(), level.trim()].filter(Boolean).join(' ')
  const suffix = [season.trim(), year.trim()].filter(Boolean).join(' ')
  if (prefix && suffix) return `${prefix}, ${suffix}`
  return prefix || suffix
}

const SEASONS = ['vinter', 'vår', 'sommar', 'höst']

function LeagueDialog({
  open, onOpenChange, league, onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  league: League
  onSave: (values: {
    name: string; status: string; year: number | null
    season: string | null; level: string | null; age: string | null; region: string | null
  }) => Promise<void>
}) {
  const [age, setAge] = useState(league.age ?? '')
  const [region, setRegion] = useState(league.region ?? '')
  const [level, setLevel] = useState(league.level ?? '')
  const [season, setSeason] = useState(league.season ?? '')
  const [year, setYear] = useState(league.year != null ? String(league.year) : '')
  const [name, setName] = useState(league.name)
  const [nameEdited, setNameEdited] = useState(false)
  const [status, setStatus] = useState(league.status)
  const [saving, setSaving] = useState(false)

  const composed = composeName(age, region, level, season, year)
  const effectiveName = nameEdited ? name : composed

  async function handleSave() {
    const finalName = effectiveName.trim()
    if (!finalName) return
    setSaving(true)
    try {
      await onSave({
        name: finalName,
        status,
        year: year.trim() ? Number(year) : null,
        season: season.trim() || null,
        level: level.trim() || null,
        age: age.trim() || null,
        region: region.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{league.id === 0 ? 'Ny serie' : 'Redigera serie'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="league-age">Ålder</Label>
              <Input
                id="league-age"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="t.ex. P13"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="league-region">Region</Label>
              <Input
                id="league-region"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="t.ex. Sydvästra"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="league-level">Nivå</Label>
              <Input
                id="league-level"
                value={level}
                onChange={e => setLevel(e.target.value)}
                placeholder="t.ex. A2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="league-year">År</Label>
              <Input
                id="league-year"
                type="number"
                inputMode="numeric"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="t.ex. 2026"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Säsong</Label>
            <div className="grid grid-cols-4 gap-2">
              {SEASONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeason(prev => (prev === s ? '' : s))}
                  className={`py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                    season === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="league-name">Namn</Label>
            <Input
              id="league-name"
              value={effectiveName}
              onChange={e => { setNameEdited(true); setName(e.target.value) }}
              onKeyDown={e => { if (e.key === 'Enter' && !saving) { e.preventDefault(); handleSave() } }}
              placeholder="t.ex. P13 Sydvästra A2, höst 2026"
            />
            {nameEdited && composed && (
              <button
                type="button"
                onClick={() => { setNameEdited(false); setName(composed) }}
                className="self-start text-xs text-primary hover:underline"
              >
                Använd automatiskt namn: {composed}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <div className="flex gap-2">
              {(['Aktiv', 'Avslutad'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    status === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'Aktiv' ? 'Pågående' : 'Avslutad'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !effectiveName.trim()}
            style={{ backgroundColor: '#106A37', color: '#FFCF08' }}
          >
            {saving ? 'Sparar…' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
