'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGetTrainings, useCreateTraining, useUpdateTraining } from '../hooks/backend/trainings'
import { Search, MapPin, Plus, CalendarPlus, Pencil } from 'lucide-react'
import { trainingTypeColor } from '../utils/trainingTypeColor'
import { AttendanceStatsButton } from '../components/AttendanceStatsButton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../lib/shadcn/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../lib/shadcn/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/shadcn/select'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { wallDayIso } from '../utils/dateWindow'

// Senaste året bakåt och ett halvår framåt (importen från Svenskalag kan
// lägga in träningar långt fram, som annars tränger undan de närmaste).
const TRAINING_WINDOW = () => ({ limit: 1000, from: wallDayIso(-365), to: wallDayIso(183) })

interface Training {
  id: number
  type: string
  date1: string
  date: string
  indooroutdoor: string
  notes: string | null
  reported: boolean
  svenskalag: string | null
  present_count: string
  total_registered: string
  p_narvarande: string
  p_anmald: string
  p_kallad: string
  p_ej: string
  l_narvarande: string
  l_anmald: string
  l_kallad: string
  l_ej: string
}

const TYPE_FILTERS = ['Alla', 'Träning', 'Extra', 'Coerver', 'Målvaktsträning']
const TRAINING_TYPES = ['Träning', 'Extra', 'Coerver', 'Målvaktsträning']
const LOCATIONS = ['Inomhus', 'Utomhus']

function pad(n: number) {
  return String(n).padStart(2, '0')
}
// Format a stored (UTC) timestamp for a datetime-local input, keeping the UTC clock time.
function toDatetimeLocal(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('sv-SE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  })
}

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default function Trainings() {
  const { data, loading, trigger } = useGetTrainings()
  const { trigger: createTraining } = useCreateTraining()
  const { trigger: updateTraining, loading: savingEdit } = useUpdateTraining()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Alla')
  const [reportedFilter, setReportedFilter] = useState<'all' | 'unreported' | 'reported'>('all')
  const [timeFilter, setTimeFilter] = useState<'coming' | 'recent' | 'all'>('coming')
  const [weekDialogOpen, setWeekDialogOpen] = useState(false)
  const [creatingWeek, setCreatingWeek] = useState(false)

  // Upcoming training week: next Monday (strictly future), plus Tue (+1) and Thu (+3), all at 19:00.
  const weekDates = useMemo(() => {
    const now = new Date()
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    let toMonday = (1 - base.getUTCDay() + 7) % 7
    if (toMonday === 0) toMonday = 7
    const monday = new Date(base)
    monday.setUTCDate(base.getUTCDate() + toMonday)
    const fmt = (offsetDays: number) => {
      const d = new Date(monday)
      d.setUTCDate(monday.getUTCDate() + offsetDays)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}T19:00:00Z`
    }
    return [fmt(0), fmt(1), fmt(3)]
  }, [])

  async function handleCreateWeek() {
    setCreatingWeek(true)
    try {
      for (const date of weekDates) {
        await createTraining({ type: 'Träning', date, indooroutdoor: 'Utomhus' })
      }
      setWeekDialogOpen(false)
      await trigger(TRAINING_WINDOW(), { skipCache: true })
    } finally {
      setCreatingWeek(false)
    }
  }

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editSvenskalag, setEditSvenskalag] = useState<string | null>(null)
  const [editType, setEditType] = useState('Träning')
  const [editDate, setEditDate] = useState('')
  const [editLocation, setEditLocation] = useState('Utomhus')
  const [editNotes, setEditNotes] = useState('')

  function openEditDialog(t: Training) {
    setEditId(t.id)
    setEditType(t.type)
    setEditDate(toDatetimeLocal(t.date))
    setEditLocation(t.indooroutdoor)
    setEditNotes(t.notes ?? '')
    setEditSvenskalag(t.svenskalag)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (editId == null || !editDate) return
    await updateTraining({
      id: editId,
      type: editType,
      date: `${editDate}:00Z`,
      indooroutdoor: editLocation,
      notes: editNotes,
      svenskalag: editSvenskalag,
    })
    setEditOpen(false)
    await trigger(TRAINING_WINDOW(), { skipCache: true })
  }

  useEffect(() => {
    trigger(TRAINING_WINDOW())
  }, [])

  const trainings = data as unknown as Training[] | undefined

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const recentCutoff = new Date(todayStart)
  recentCutoff.setUTCDate(recentCutoff.getUTCDate() - 14)

  const filtered = (trainings ?? []).filter(t => {
    const trainingDate = new Date(t.date)
    if (timeFilter === 'coming' && trainingDate < todayStart && t.reported) return false
    if (timeFilter === 'recent' && (!t.reported || trainingDate < recentCutoff)) return false
    if (typeFilter !== 'Alla' && t.type !== typeFilter) return false
    if (reportedFilter === 'unreported' && t.reported) return false
    if (reportedFilter === 'reported' && !t.reported) return false
    if (search) {
      const q = search.toLowerCase()
      const d = formatDate(t.date).toLowerCase()
      const n = (t.notes ?? '').toLowerCase()
      return d.includes(q) || n.includes(q) || t.type.toLowerCase().includes(q)
    }
    return true
  })

  // Sort: coming = ascending, recent/all = descending
  const sorted = [...filtered].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
    return timeFilter === 'coming' ? diff : -diff
  })

  // Group by month
  const grouped: Record<string, Training[]> = {}
  for (const t of sorted) {
    const key = monthLabel(t.date)
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(t)
  }

  const typeColor = (type: string) => trainingTypeColor(type)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Träningar</h1>
            <p className="text-team-accent/70 text-sm">{filtered.length} pass</p>
          </div>
          <div className="flex items-center gap-3">
            <AttendanceStatsButton />
            <button
              onClick={() => setWeekDialogOpen(true)}
              className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
              aria-label="Skapa träningsvecka (mån, tis, tors 19:00)"
              title="Skapa mån/tis/tors 19:00"
            >
              <CalendarPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/trainings/new')}
              className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
              aria-label="Lägg till träning"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex flex-col gap-2">
        {/* Time filter */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {([['coming', 'Kommande'], ['recent', 'Senaste'], ['all', 'Alla']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTimeFilter(val)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                timeFilter === val
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök träning..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                typeFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['unreported', 'reported', 'all'] as const).map(v => (
            <button
              key={v}
              onClick={() => setReportedFilter(v)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                reportedFilter === v
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {v === 'unreported' ? 'Ej rapporterade' : v === 'reported' ? 'Rapporterade' : 'Alla'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-3 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-2 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Inga träningar hittades</p>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 capitalize">
                {month}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map(t => (
                  <div key={t.id} className="relative">
                    <button
                      onClick={() => router.push(`/trainings/${t.id}`)}
                      className={`w-full text-left border rounded-xl px-3 py-2.5 pr-10 flex flex-col gap-1.5 ${
                        t.reported
                          ? 'bg-green-500/15 border-green-500/30'
                          : 'bg-primary/10 border-primary/20'
                      }`}
                    >
                      {/* Row 1: info */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-xs font-semibold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: typeColor(t.type) }}>{t.type}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{t.indooroutdoor}</span>
                          <span className="text-sm font-bold text-foreground capitalize">{formatDate(t.date)}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(t.date)}</span>
                          {t.notes && <span className="text-xs text-muted-foreground italic truncate">{t.notes}</span>}
                        </div>
                      </div>
                      {/* Row 2: status badges */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { p: t.p_narvarande, l: t.l_narvarande, color: '#008000' },
                          { p: t.p_anmald,     l: t.l_anmald,     color: '#0000FF' },
                          { p: t.p_ej,         l: t.l_ej,         color: '#FF0000' },
                          { p: t.p_kallad,     l: t.l_kallad,     color: '#9333ea' },
                        ].map((s, i) => (
                          <span key={i} className="text-xs font-bold text-white rounded px-1.5 py-0.5 text-center" style={{ backgroundColor: s.color }}>
                            {s.p}<span className="opacity-75">+{s.l}</span>
                          </span>
                        ))}
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditDialog(t) }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                      aria-label="Redigera träning"
                      title="Redigera"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create training week confirm */}
      <AlertDialog open={weekDialogOpen} onOpenChange={setWeekDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skapa tre träningar?</AlertDialogTitle>
            <AlertDialogDescription>
              Följande träningar skapas (Träning, Utomhus):
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="flex flex-col gap-1 text-sm text-foreground">
            {weekDates.map(d => (
              <li key={d} className="capitalize">{formatDate(d)} kl. {formatTime(d)}</li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingWeek}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCreateWeek() }}
              disabled={creatingWeek}
            >
              {creatingWeek ? 'Skapar…' : 'Skapa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit training dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Redigera träning</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Typ</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRAINING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Datum &amp; tid</Label>
              <Input
                type="datetime-local"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="[color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Plats</Label>
              <Select value={editLocation} onValueChange={setEditLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Svenskalag</Label>
              <Input
                type="text"
                value={editSvenskalag ?? ''}
                onChange={e => setEditSvenskalag(e.target.value || null)}
                placeholder="https://svenskalag.se/…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Anteckningar</Label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Valfritt…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Avbryt
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editDate || savingEdit}
              style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
            >
              {savingEdit ? 'Sparar…' : 'Spara'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
