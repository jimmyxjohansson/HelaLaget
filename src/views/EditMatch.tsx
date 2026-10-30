'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { useGetMatch } from '../hooks/backend/matches'
import { Combobox } from '../components/Combobox'
import { useGetTeamsAndLeagues } from '../hooks/backend/matches'
import { useUpdateMatch } from '../hooks/backend/matches'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../lib/shadcn/select'
import { rankStyle } from '../utils/rankColors'
import { countryFlag } from '../utils/countryFlag'

const TYPES = ['Serie', 'Cup', 'Träning']
const HOMEAWAY = ['Hemma', 'Borta']
const LOCATIONS = ['Inomhus', 'Utomhus']
const MATCHPLAYERS = ['3 v 3', '5 v 5', '7 v 7', '8 v 8', '9 v 9', '11 v 11']
const DIFFICULTIES = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X']

interface MatchData {
  id: number
  matchtype: string
  vs: number | null
  date: string
  homeaway: string
  ourgoals: number
  theirgoals: number
  indooroutdoor: string
  outcome: string
  status: string
  location: string | null
  notes: string | null
  teamname: string | null
  league: number | null
  league_name: string | null
  cup: number | null
  cupphase: string | null
  difficulty: string | null
  matchplayers: string | null
  playtime: number | null
  periods: number | null
  opponent: string | null
  fogislink: string | null
  fogisno: string | null
  svenskalag: string | null
}

interface MatchResult {
  match: MatchData | null
  participants: unknown[]
}

interface FormState {
  matchtype: string
  vs: string
  date: string
  homeaway: string
  status: string
  ourgoals: string
  theirgoals: string
  outcome: string
  location: string
  notes: string
  league: string
  cup: string
  teamname: string
  indooroutdoor: string
  matchplayers: string
  playtime: string
  periods: string
  difficulty: string
  fogislink: string
  fogisno: string
  svenskalag: string
  cupphase: string
}

function toLocalDatetimeValue(isoString: string): string {
  // Convert UTC ISO string to YYYY-MM-DDTHH:mm for datetime-local input
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function fromLocalDatetimeValue(value: string): string {
  // Treat the datetime-local value as UTC
  return new Date(value + ':00Z').toISOString()
}

export default function EditMatch() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: matchData, loading: matchLoading, trigger: fetchMatch } = useGetMatch()
  const { data: refData, loading: refLoading, trigger: fetchRefs } = useGetTeamsAndLeagues()
  const { loading: saving, trigger: saveMatch } = useUpdateMatch()

  const [form, setForm] = useState<FormState | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id) fetchMatch({ id: Number(id) })
    fetchRefs({})
  }, [id])

  // Populate form once match is loaded
  useEffect(() => {
    const result = matchData as unknown as MatchResult | undefined
    const m = result?.match
    if (!m) return
    setForm({
      matchtype: m.matchtype ?? 'Serie',
      vs: m.vs != null ? String(m.vs) : '',
      date: m.date ? toLocalDatetimeValue(m.date) : '',
      homeaway: m.homeaway ?? 'Hemma',
      status: m.status ?? 'Ny',
      ourgoals: m.ourgoals != null ? String(m.ourgoals) : '0',
      theirgoals: m.theirgoals != null ? String(m.theirgoals) : '0',
      outcome: m.outcome ?? '',
      location: m.location ?? '',
      notes: m.notes ?? '',
      league: m.league != null ? String(m.league) : '',
      cup: m.cup != null ? String(m.cup) : '',
      teamname: m.teamname ?? '',
      indooroutdoor: m.indooroutdoor ?? 'Utomhus',
      matchplayers: m.matchplayers ?? '',
      playtime: m.playtime != null ? String(m.playtime) : '',
      periods: m.periods != null ? String(m.periods) : '',
      difficulty: m.difficulty ?? '',
      fogislink: m.fogislink ?? '',
      fogisno: m.fogisno ?? '',
      svenskalag: m.svenskalag ?? '',
      cupphase: m.cupphase ?? '',
    })
  }, [matchData])

  const refResult = refData as unknown as {
    teams: { id: number; team: string; imgurl: string | null; country: string | null }[]
    leagues: { id: number; name: string }[]
    cups: { id: number; name: string }[]
  } | undefined
  const teams = refResult?.teams ?? []
  const leagues = refResult?.leagues ?? []
  const cups = refResult?.cups ?? []

  function set(field: keyof FormState, value: string) {
    setForm(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function handleSave() {
    if (!form || !id) return
    setSaveError(null)
    setSaved(false)
    const isSerie = form.matchtype === 'Serie'
    const isCup = form.matchtype === 'Cup'
    try {
      await saveMatch({
        id: Number(id),
        matchtype: form.matchtype,
        vs: form.vs ? Number(form.vs) : null,
        date: form.date ? fromLocalDatetimeValue(form.date) : '',
        homeaway: form.homeaway,
        status: form.status,
        ourgoals: form.ourgoals !== '' ? Number(form.ourgoals) : null,
        theirgoals: form.theirgoals !== '' ? Number(form.theirgoals) : null,
        outcome: form.outcome,
        location: form.location || null,
        notes: form.notes || null,
        league: isSerie && form.league ? Number(form.league) : null,
        cup: isCup && form.cup ? Number(form.cup) : null,
        cupphase: isCup && form.cupphase ? form.cupphase : null,
        fogisno: isSerie && form.fogisno ? form.fogisno : null,
        fogislink: isSerie && form.fogislink ? form.fogislink : null,
        teamname: form.teamname || null,
        indooroutdoor: form.indooroutdoor,
        matchplayers: form.matchplayers || null,
        playtime: form.playtime !== '' ? Number(form.playtime) : null,
        periods: form.periods !== '' ? Number(form.periods) : null,
        difficulty: form.difficulty || null,
        svenskalag: form.svenskalag || null,
      })
      setSaved(true)
      setTimeout(() => router.push(`/matches/${id}`), 800)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Okänt fel')
    }
  }

  const isLoading = matchLoading || refLoading

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-4" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-team-accent/80 hover:text-team-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Tillbaka</span>
          </button>
        </div>
        <h1 className="text-lg font-bold text-team-accent">Redigera match</h1>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-5">
        {isLoading || !form ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            {/* Basic info — same order as NewMatch */}
            <Section title="Grundinfo">
              <Field label="Datum & tid">
                <Input
                  type="datetime-local"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                />
              </Field>

              <Field label="Hemma / Borta">
                <Select value={form.homeaway} onValueChange={v => set('homeaway', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOMEAWAY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Motståndare">
                <Combobox
                  options={teams.map(t => ({ value: String(t.id), label: t.team, imageUrl: t.imgurl, flag: countryFlag(t.country) }))}
                  value={form.vs}
                  onValueChange={v => set('vs', v)}
                  placeholder="Välj lag…"
                  searchPlaceholder="Sök lag…"
                  emptyMessage="Inget lag hittades."
                  className="w-full"
                />
              </Field>

              <Field label="Lagnamn">
                <Input
                  value={form.teamname}
                  onChange={e => set('teamname', e.target.value)}
                  placeholder="t.ex. Svart"
                />
              </Field>

              <Field label="Typ">
                <Select value={form.matchtype} onValueChange={v => set('matchtype', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              {form.matchtype === 'Cup' && (
                <>
                  <Field label="Cup">
                    <Combobox
                      options={cups.map(c => ({ value: String(c.id), label: c.name }))}
                      value={form.cup}
                      onValueChange={v => set('cup', v)}
                      placeholder="Välj cup..."
                      emptyMessage="Inga cuper hittades."
                      className="w-full"
                    />
                  </Field>
                  <Field label="Cupfas">
                    <Input
                      value={form.cupphase}
                      onChange={e => set('cupphase', e.target.value)}
                      placeholder="t.ex. Gruppspel"
                    />
                  </Field>
                </>
              )}

              {form.matchtype === 'Serie' && (
                <>
                  <Field label="Serie">
                    <Combobox
                      options={leagues.map(l => ({ value: String(l.id), label: l.name }))}
                      value={form.league}
                      onValueChange={v => set('league', v)}
                      placeholder="Välj serie..."
                      emptyMessage="Inga hittades."
                      className="w-full"
                    />
                  </Field>
                  <Field label="Matchnummer">
                    <Input
                      value={form.fogisno}
                      onChange={e => set('fogisno', e.target.value)}
                      placeholder="t.ex. 12345678"
                    />
                  </Field>
                  <Field label="Fogis">
                    <Input
                      value={form.fogislink}
                      onChange={e => set('fogislink', e.target.value)}
                      placeholder="https://fogis.se/…"
                    />
                  </Field>
                </>
              )}

              <Field label="Spelform">
                <Select
                  value={form.matchplayers || '__none__'}
                  onValueChange={v => set('matchplayers', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Välj spelform…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">–</SelectItem>
                    {MATCHPLAYERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Inomhus / Utomhus">
                <Select value={form.indooroutdoor} onValueChange={v => set('indooroutdoor', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Speltid (min)">
                  <Input
                    type="number"
                    min={0}
                    value={form.playtime}
                    onChange={e => set('playtime', e.target.value)}
                    placeholder="t.ex. 60"
                  />
                </Field>
                <Field label="Perioder">
                  <Input
                    type="number"
                    min={0}
                    value={form.periods}
                    onChange={e => set('periods', e.target.value)}
                    placeholder="t.ex. 2"
                  />
                </Field>
              </div>

              <Field label="Nivå">
                <Select
                  value={form.difficulty || '__none__'}
                  onValueChange={v => set('difficulty', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Välj nivå…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">–</SelectItem>
                    {DIFFICULTIES.map(d => (
                      <SelectItem key={d} value={d}>
                        <span
                          className="inline-block text-xs font-bold px-2 py-0.5 rounded"
                          style={rankStyle(d)}
                        >
                          {d}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Plan">
                <Input
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="Plats / arena"
                />
              </Field>

              <Field label="Svenskalag">
                <Input
                  value={form.svenskalag}
                  onChange={e => set('svenskalag', e.target.value)}
                  placeholder="https://svenskalag.se/…"
                />
              </Field>
            </Section>

            {/* Status & result — edit-only fields */}
            <Section title="Status & resultat">
              <Field label="Status">
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ny">Ny</SelectItem>
                    <SelectItem value="Kallad">Kallad</SelectItem>
                    <SelectItem value="Förslag">Förslag</SelectItem>
                    <SelectItem value="Avslutad">Avslutad</SelectItem>
                    <SelectItem value="Registrerad i Fogis">Registrerad i Fogis</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Utfall">
                <Select value={form.outcome || '__none__'} onValueChange={v => set('outcome', v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Välj utfall…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">–</SelectItem>
                    <SelectItem value="Vinst">Vinst</SelectItem>
                    <SelectItem value="Förlust">Förlust</SelectItem>
                    <SelectItem value="Oavgjort">Oavgjort</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Våra mål">
                  <Input
                    type="number"
                    min={0}
                    value={form.ourgoals}
                    onChange={e => set('ourgoals', e.target.value)}
                  />
                </Field>
                <Field label="Deras mål">
                  <Input
                    type="number"
                    min={0}
                    value={form.theirgoals}
                    onChange={e => set('theirgoals', e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Anteckningar">
              <Textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={4}
                placeholder="Fritext om matchen…"
                className="resize-none"
              />
            </Section>

            {/* Save feedback */}
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            {saved && (
              <p className="text-sm text-green-600 dark:text-green-400">Matchdata sparad!</p>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Sparar…' : 'Spara match'}
            </Button>

            <div className="h-4" />
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}
