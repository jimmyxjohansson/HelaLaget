'use client'

import { useRouter } from '../lib/nav'
import { useEffect, useRef, useState } from 'react'
import {
  Search, Plus, Pencil, Trash2, Shield, Upload, X, Loader2, Swords, ArrowUp, ArrowDown,
} from 'lucide-react'
import {
  useGetTeams, useCreateTeam, useUpdateTeam, useDeleteTeam, useUploadTeamLogo,
} from '../hooks/backend/teams'
import { useGetMatchesVsOpponent } from '../hooks/backend/matches'
import { usePersistentState } from '../hooks/usePersistentState'
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
import { countryFlag } from '../utils/countryFlag'
import { rankStyle } from '../utils/rankColors'
import SquadLogo from '../components/SquadLogo'

interface Team {
  id: number
  team: string | null
  imgurl: string | null
  country: string | null
  city?: string | null
  matchcount?: number
  won?: number
  lost?: number
  drawn?: number
  goals_for?: number
  goals_against?: number
}

interface OpponentMatch {
  id: number
  date: string
  outcome: string
  ourgoals: number
  theirgoals: number
  homeaway: string
  difficulty: string | null
  matchtype: string
  status: string
  league_name: string | null
  cup_name: string | null
}

function fileToBase64(file: File): Promise<string> {  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip the "data:<mime>;base64," prefix
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

type SortDir = 'asc' | 'desc'
const SORT_OPTIONS = [
  { value: 'name', label: 'Namn' },
  { value: 'matches', label: 'Antal matcher' },
]
const DEFAULT_SORT_DIR: Record<string, SortDir> = {
  name: 'asc',
  matches: 'desc',
}

export default function Teams() {
  const { data, loading, trigger: fetchTeams } = useGetTeams()
  const { trigger: createTeam } = useCreateTeam()
  const { trigger: updateTeam } = useUpdateTeam()
  const { trigger: deleteTeam } = useDeleteTeam()
  const { trigger: uploadLogo } = useUploadTeamLogo()

  const [search, setSearch] = useState('')
  const [sort, setSort] = usePersistentState('teams.sort', 'name')
  const [sortDir, setSortDir] = usePersistentState<SortDir>('teams.sortDir', 'asc')
  const [editing, setEditing] = useState<Team | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [matchesTeam, setMatchesTeam] = useState<Team | null>(null)

  useEffect(() => { fetchTeams({}, { skipCache: true }) }, [])

  function handleSort(field: string) {
    if (sort === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setSortDir(DEFAULT_SORT_DIR[field] ?? 'asc')
    }
  }

  const teams = data as unknown as Team[] | undefined

  const filtered = (teams ?? []).filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (t.team ?? '').toLowerCase().includes(q) ||
      (t.country ?? '').toLowerCase().includes(q) ||
      (t.city ?? '').toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sort === 'matches') {
      const cmp = (a.matchcount ?? 0) - (b.matchcount ?? 0)
      if (cmp !== 0) return cmp * dir
      return (a.team ?? '').localeCompare(b.team ?? '', 'sv')
    }
    return (a.team ?? '').localeCompare(b.team ?? '', 'sv') * dir
  })

  function openNew() {
    setEditing({ id: 0, team: '', imgurl: null, country: 'Sverige' })
    setDialogOpen(true)
  }

  function openEdit(t: Team) {
    setEditing(t)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTeam({ id: deleteTarget.id })
      setDeleteTarget(null)
      await fetchTeams({}, { skipCache: true })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <SquadLogo />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Lag</h1>
              <p className="text-team-accent/70 text-sm">{filtered.length} lag</p>
            </div>
          </div>
          <button
              onClick={openNew}
              className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
              aria-label="Lägg till lag"
            >
              <Plus className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Search + sort */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök lag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {SORT_OPTIONS.map(opt => {
            const active = sort === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => handleSort(opt.value)}
                className={`flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
                {active && (
                  sortDir === 'asc'
                    ? <ArrowUp className="w-3.5 h-3.5" />
                    : <ArrowDown className="w-3.5 h-3.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-3">
        {loading && !teams ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laddar...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Inga lag hittades.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
              >
                <button
                  onClick={() => (t.matchcount ?? 0) > 0 && setMatchesTeam(t)}
                  disabled={(t.matchcount ?? 0) === 0}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-default"
                >
                  <TeamLogo url={t.imgurl} name={t.team} />
                  {countryFlag(t.country) && (
                    <span className="text-xl leading-none flex-shrink-0" title={t.country ?? ''}>
                      {countryFlag(t.country)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{t.team}</p>
                    {(t.city || t.country) && (
                      <p className="text-xs text-muted-foreground">{[t.city, t.country].filter(Boolean).join(', ')}</p>
                    )}
                    {(t.matchcount ?? 0) > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1" title="Vinster">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">{t.won ?? 0}</span>
                          <span className="text-xs text-muted-foreground">V</span>
                        </div>
                        <div className="flex items-center gap-1" title="Oavgjorda">
                          <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">{t.drawn ?? 0}</span>
                          <span className="text-xs text-muted-foreground">O</span>
                        </div>
                        <div className="flex items-center gap-1" title="Förluster">
                          <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">{t.lost ?? 0}</span>
                          <span className="text-xs text-muted-foreground">F</span>
                        </div>
                        <div className="ml-1 text-sm font-bold text-foreground tabular-nums">{t.goals_for ?? 0}–{t.goals_against ?? 0}</div>
                        <span className="text-xs text-muted-foreground">mål</span>
                      </div>
                    )}
                  </div>
                  <span
                    className="flex items-center gap-1 flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground"
                    title="Antal spelade matcher"
                  >
                    <Swords className="w-3 h-3" />
                    {t.matchcount ?? 0}
                  </span>
                </button>
                <button
                  onClick={() => openEdit(t)}
                  aria-label="Redigera"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(t)}
                  aria-label="Ta bort"
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <TeamDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          team={editing}
          onUpload={async (file) => {
            const base64 = await fileToBase64(file)
            const res = await uploadLogo({
              fileName: file.name,
              data: base64,
              mimeType: file.type || 'application/octet-stream',
            })
            return (res as unknown as { url: string }).url
          }}
          onSave={async (values) => {
            if (editing.id === 0) {
              await createTeam(values as unknown as Record<string, unknown>)
            } else {
              await updateTeam({ id: editing.id, ...values } as unknown as Record<string, unknown>)
            }
            setDialogOpen(false)
            await fetchTeams({}, { skipCache: true })
          }}
        />
      )}

      <OpponentMatchesDialog
        team={matchesTeam}
        onOpenChange={(o) => !o && setMatchesTeam(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort lag?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {deleteTarget?.team}? Detta går inte att ångra.
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

function outcomeStyle(outcome: string) {
  if (outcome === 'Vinst')    return { bg: '#16a34a', label: 'Vinst' }
  if (outcome === 'Förlust')  return { bg: '#dc2626', label: 'Förlust' }
  if (outcome === 'Oavgjort') return { bg: '#d97706', label: 'Oavgjort' }
  return null
}

function OpponentMatchesDialog({
  team, onOpenChange,
}: {
  team: Team | null
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const { data, loading, trigger } = useGetMatchesVsOpponent()

  useEffect(() => {
    if (team) trigger({ vs: team.id })
  }, [team?.id])

  const matches = data as unknown as OpponentMatch[] | undefined

  return (
    <Dialog open={!!team} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {team?.imgurl && (
              <img src={team.imgurl} alt="" className="w-6 h-6 object-contain" />
            )}
            Tidigare möten mot {team?.team ?? '–'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Laddar…</p>
        ) : matches?.length ? (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2 font-semibold">Datum</th>
                  <th className="py-2 pr-2 font-semibold">Status</th>
                  <th className="py-2 pr-2 font-semibold">Utfall</th>
                  <th className="py-2 pr-2 font-semibold">Resultat</th>
                  <th className="py-2 pr-2 font-semibold">Nivå</th>
                  <th className="py-2 font-semibold">Cup / Serie</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(om => {
                  const oc = outcomeStyle(om.outcome)
                  return (
                    <tr
                      key={om.id}
                      onClick={() => { onOpenChange(false); router.push(`/matches/${om.id}`) }}
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40"
                    >
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {new Date(om.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={om.status === 'Avslutad'
                            ? { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                            : { backgroundColor: '#2563eb', color: '#fff' }}
                        >
                          {om.status}
                        </span>
                      </td>
                      <td className="py-2 pr-2">
                        {om.status === 'Avslutad' && oc ? (
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: oc.bg }}>
                            {oc.label}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="py-2 pr-2 font-semibold tabular-nums">{om.status === 'Avslutad' ? `${om.ourgoals} – ${om.theirgoals}` : '–'}</td>
                      <td className="py-2 pr-2">
                        {om.difficulty ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={rankStyle(om.difficulty)}>
                            {om.difficulty}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="py-2 text-muted-foreground">{om.cup_name ?? om.league_name ?? '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">Inga tidigare möten.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TeamLogo({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'Lag'}
        className="w-11 h-11 rounded-lg object-contain bg-muted flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
      <Shield className="w-5 h-5 text-muted-foreground" />
    </div>
  )
}

interface TeamValues {
  team: string
  country: string | null
  imgurl: string | null
  city: string | null
}

function TeamDialog({
  open, onOpenChange, team, onSave, onUpload,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  team: Team
  onSave: (values: TeamValues) => Promise<void>
  onUpload: (file: File) => Promise<string>
}) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('Sverige')
  const [city, setCity] = useState('')
  const [imgurl, setImgurl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(team.team ?? '')
    setCountry(team.country ?? 'Sverige')
    setCity(team.city ?? '')
    setImgurl(team.imgurl ?? null)
    setError(null)
  }, [open, team.id])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await onUpload(file)
      setImgurl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda upp logotyp.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Ange ett lagnamn.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({ team: name.trim(), country: country || null, imgurl, city: city.trim() || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team.id === 0 ? 'Nytt lag' : 'Redigera lag'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <TeamLogo url={imgurl} name={name} />
              {imgurl && (
                <button
                  onClick={() => setImgurl(null)}
                  aria-label="Ta bort logotyp"
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Laddar upp...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Ladda upp logotyp</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Sparas i mappen "Lag"</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Lagnamn</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Lagets namn" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ort</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="t.ex. Malmö" />
            </div>
            <div className="space-y-1.5">
              <Label>Land</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="t.ex. Sverige" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Orten visar laget på kartan under Statistik.</p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
          >
            {saving ? 'Sparar...' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
