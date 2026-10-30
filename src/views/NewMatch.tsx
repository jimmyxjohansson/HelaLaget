'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { useCreateMatch, useGetTeamsAndLeagues } from '../hooks/backend/matches'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Combobox } from '../components/Combobox'
import { AddTeamDialog, type CreatedTeam } from '../components/AddTeamDialog'
import { rankStyle } from '../utils/rankColors'
import { countryFlag } from '../utils/countryFlag'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/shadcn/select'

const TYPES = ['Serie', 'Cup', 'Träning']
const HOMEAWAY = ['Hemma', 'Borta']
const LOCATIONS = ['Inomhus', 'Utomhus']
const MATCHPLAYERS = ['5 v 5', '7 v 7', '8 v 8', '9 v 9', '11 v 11']
const DIFFICULTIES = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X']

const PLAYTIME_BY_MATCHPLAYERS: Record<string, string> = {
  '9 v 9': '25',
  '7 v 7': '20',
}

function toIso(datetime: string) {
  return `${datetime}:00Z`
}

function formatCupDates(startdate: string | null, enddate: string | null): string | null {
  if (!startdate && !enddate) return null
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  if (startdate && enddate && startdate !== enddate) return `${fmt(startdate)} – ${fmt(enddate)}`
  return fmt((startdate ?? enddate)!)
}

export default function NewMatch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cupParam = searchParams.get('cup')
  const { loading: creating, trigger: create } = useCreateMatch()
  const { data: refData, trigger: fetchRefs } = useGetTeamsAndLeagues()

  // Field state — in display order
  const [dateVal, setDateVal] = useState('')
  const [homeaway, setHomeaway] = useState('Hemma')
  const [vs, setVs] = useState('')
  const [teamname, setTeamname] = useState('')
  const [matchtype, setMatchtype] = useState(cupParam ? 'Cup' : 'Träning')
  // Cup
  const [cup, setCup] = useState(cupParam ?? '')
  const [cupphase, setCupphase] = useState('')
  // Serie
  const [league, setLeague] = useState('')
  const [fogisno, setFogisno] = useState('')
  const [fogislink, setFogislink] = useState('')
  // Generic
  const [matchplayers, setMatchplayers] = useState('9 v 9')
  const [indoor, setIndoor] = useState('Utomhus')
  const [playtime, setPlaytime] = useState('25')
  const [periods, setPeriods] = useState('3')
  const [difficulty, setDifficulty] = useState('')
  const [location, setLocation] = useState('')
  const [svenskalag, setSvenskalag] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [addTeamOpen, setAddTeamOpen] = useState(false)
  const [addTeamName, setAddTeamName] = useState('')
  const [extraTeams, setExtraTeams] = useState<CreatedTeam[]>([])

  const refs = refData as unknown as {
    teams: { id: number; team: string; imgurl: string | null; country: string | null }[]
    leagues: { id: number; name: string }[]
    cups: {
      id: number; name: string; startdate: string | null; enddate: string | null
      indooroutdoor: string | null; periods: number | null; playtime: number | null
      matchplayers: string | null; difficulty: string | null
    }[]
  } | undefined
  const teams = [...(refs?.teams ?? []), ...extraTeams]
  const leagues = refs?.leagues ?? []
  const cups = refs?.cups ?? []

  useEffect(() => { fetchRefs({}) }, [])

  // When a cup is selected (e.g. preselected via URL, or picked from the list),
  // default the date to the cup's start date at 09:00 and inherit the cup's
  // match settings (inomhus/utomhus, perioder, speltid, spelform och nivå).
  useEffect(() => {
    if (matchtype !== 'Cup' || !cup) return
    const selectedCup = cups.find(c => String(c.id) === cup)
    if (!selectedCup) return
    if (selectedCup.startdate) {
      setDateVal(`${selectedCup.startdate}T09:00`)
    }
    if (selectedCup.indooroutdoor) setIndoor(selectedCup.indooroutdoor)
    if (selectedCup.periods != null) setPeriods(String(selectedCup.periods))
    if (selectedCup.playtime != null) setPlaytime(String(selectedCup.playtime))
    if (selectedCup.matchplayers) setMatchplayers(selectedCup.matchplayers)
    if (selectedCup.difficulty) setDifficulty(selectedCup.difficulty)
  }, [cup, cups, matchtype])

  async function handleSave() {
    if (!dateVal) { setError('Välj datum och tid.'); return }
    setError(null)
    const iso = toIso(dateVal)
    try {
      const res = (await create({
        matchtype,
        vs: vs ? Number(vs) : null,
        date: iso,
        homeaway,
        indooroutdoor: indoor,
        location: location || null,
        teamname: teamname || null,
        league: matchtype === 'Serie' && league ? Number(league) : null,
        cup: matchtype === 'Cup' && cup ? Number(cup) : null,
        cupphase: matchtype === 'Cup' && cupphase ? cupphase : null,
        fogisno: matchtype === 'Serie' && fogisno ? fogisno : null,
        fogislink: matchtype === 'Serie' && fogislink ? fogislink : null,
        matchplayers: matchplayers || null,
        playtime: playtime !== '' ? Number(playtime) : null,
        periods: periods !== '' ? Number(periods) : null,
        difficulty: difficulty || null,
        svenskalag: svenskalag || null,
        notes: notes || null,
      })) as unknown as { id?: number } | undefined
      if (res?.id) {
        if (cupParam) {
          router.push(`/cups/${cupParam}`)
        } else {
          router.push(`/matches/${res.id}`)
        }
      } else {
	    setError('Kunde inte skapa matchen.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-[#FFCF08] px-4 pt-6 pb-4" style={{ backgroundColor: '#106A37' }}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[#FFCF08]/80 hover:text-[#FFCF08] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Tillbaka</span>
          </button>
        </div>
        <h1 className="text-lg font-bold text-[#FFCF08]">Ny match</h1>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-5">
        <Section title="Grundinfo">
          <Field label="Datum & tid">
            <Input
              type="datetime-local"
              value={dateVal}
              onChange={e => setDateVal(e.target.value)}
            />
          </Field>

          <Field label="Hemma / Borta">
            <Select value={homeaway} onValueChange={setHomeaway}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOMEAWAY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Motståndare">
            <Combobox
              options={teams.map(t => ({ value: String(t.id), label: t.team, imageUrl: t.imgurl, flag: countryFlag(t.country) }))}
              value={vs}
              onValueChange={setVs}
              placeholder="Välj motståndare..."
              searchPlaceholder="Sök lag…"
              emptyMessage="Inga lag hittades."
              className="w-full"
              addNewLabel="Lägg till lag"
              onAddNew={(q) => { setAddTeamName(q); setAddTeamOpen(true) }}
            />
          </Field>

          <Field label="Lagnamn">
            <Input
              placeholder="t.ex. :Svart"
              value={teamname}
              onChange={e => setTeamname(e.target.value)}
            />
          </Field>

          <Field label="Typ">
            <Select value={matchtype} onValueChange={setMatchtype}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {matchtype === 'Cup' && (
            <>
              <Field label="Cup">
                <Combobox
                  options={cups.map(c => ({ value: String(c.id), label: c.name, description: formatCupDates(c.startdate, c.enddate) }))}
                  value={cup}
                  onValueChange={setCup}
                  placeholder="Välj cup..."
                  searchPlaceholder="Sök cup…"
                  emptyMessage="Inga cuper hittades."
                  className="w-full"
                />
              </Field>
              <Field label="Cupfas">
                <Input
                  value={cupphase}
                  onChange={e => setCupphase(e.target.value)}
                  placeholder="t.ex. Gruppspel"
                />
              </Field>
            </>
          )}

          {matchtype === 'Serie' && (
            <>
              <Field label="Serie">
                <Combobox
                  options={leagues.map(l => ({ value: String(l.id), label: l.name }))}
                  value={league}
                  onValueChange={setLeague}
				  placeholder="Välj serie..."
                  emptyMessage="Inga hittades."
                  className="w-full"
                />
              </Field>
              <Field label="Matchnummer">
                <Input
                  value={fogisno}
                  onChange={e => setFogisno(e.target.value)}
                  placeholder="t.ex. 12345678"
                />
              </Field>
              <Field label="Fogis">
                <Input
                  value={fogislink}
                  onChange={e => setFogislink(e.target.value)}
                  placeholder="https://fogis.se/…"
                />
              </Field>
            </>
          )}

          <Field label="Spelform">
            <Select
              value={matchplayers || '__none__'}
              onValueChange={v => {
                const next = v === '__none__' ? '' : v
                setMatchplayers(next)
                const def = PLAYTIME_BY_MATCHPLAYERS[next]
                if (def) setPlaytime(def)
              }}
            >
              <SelectTrigger><SelectValue placeholder="Välj spelform…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">–</SelectItem>
                {MATCHPLAYERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Inomhus / Utomhus">
            <Select value={indoor} onValueChange={setIndoor}>
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
                value={playtime}
                onChange={e => setPlaytime(e.target.value)}
                placeholder="t.ex. 60"
              />
            </Field>
            <Field label="Perioder">
              <Input
                type="number"
                min={0}
                value={periods}
                onChange={e => setPeriods(e.target.value)}
                placeholder="t.ex. 2"
              />
            </Field>
          </div>

          <Field label="Nivå">
            <Select
              value={difficulty || '__none__'}
              onValueChange={v => setDifficulty(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj nivå…" />
              </SelectTrigger>
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
              placeholder="Plats / arena"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
			</Field>

          <Field label="Svenskalag">
            <Input
              placeholder="https://svenskalag.se/…"
              value={svenskalag}
              onChange={e => setSvenskalag(e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Anteckningar">
          <Textarea
            placeholder="Valfria anteckningar..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </Section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSave}
          disabled={creating}
          className="w-full"
          style={{ backgroundColor: '#106A37', color: '#FFCF08' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {creating ? 'Sparar…' : 'Skapa match'}
        </Button>

        <div className="h-4" />
      </div>

      <AddTeamDialog
        open={addTeamOpen}
        onOpenChange={setAddTeamOpen}
        initialName={addTeamName}
        onCreated={(t) => {
          setExtraTeams(prev => [...prev, t])
          setVs(String(t.id))
        }}
      />
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
