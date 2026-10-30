'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { useGetCup, useUpdateCup } from '../hooks/backend/cups'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { rankStyle } from '../utils/rankColors'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/shadcn/select'

const MATCHPLAYERS = ['5 v 5', '7 v 7', '8 v 8', '9 v 9', '11 v 11']
const DIFFICULTIES = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X']
const LOCATIONS = ['Inomhus', 'Utomhus']
const STATUSES = ['Ny', 'Förslag', 'Kallad', 'Avslutad']

interface Cup {
  id: number
  name: string
  startdate: string | null
  enddate: string | null
  location: string | null
  difficulty: string | null
  playtime: number | null
  periods: number | null
  matchplayers: string | null
  indooroutdoor: string | null
  svenskalag: string | null
  status: string
  cupsite: string | null
}

interface CupResult {
  cup: Cup | null
}

export default function EditCup() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, trigger: fetchCup } = useGetCup()
  const { loading: saving, trigger: save } = useUpdateCup()

  const [name, setName] = useState('')
  const [startdate, setStartdate] = useState('')
  const [enddate, setEnddate] = useState('')
  const [location, setLocation] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [playtime, setPlaytime] = useState('')
  const [periods, setPeriods] = useState('')
  const [matchplayers, setMatchplayers] = useState('')
  const [indoor, setIndoor] = useState('Utomhus')
  const [status, setStatus] = useState('Ny')
  const [svenskalag, setSvenskalag] = useState('')
  const [cupsite, setCupsite] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (id) fetchCup({ id: Number(id) }) }, [id])

  const result = data as unknown as CupResult | undefined
  const cup = result?.cup

  useEffect(() => {
    if (!cup) return
    setName(cup.name ?? '')
    setStartdate(cup.startdate ?? '')
    setEnddate(cup.enddate ?? '')
    setLocation(cup.location ?? '')
    setDifficulty(cup.difficulty ?? '')
    setPlaytime(cup.playtime != null ? String(cup.playtime) : '')
    setPeriods(cup.periods != null ? String(cup.periods) : '')
    setMatchplayers(cup.matchplayers ?? '')
    setIndoor(cup.indooroutdoor ?? 'Utomhus')
    setStatus(cup.status ?? 'Ny')
    setSvenskalag(cup.svenskalag ?? '')
    setCupsite(cup.cupsite ?? '')
  }, [cup?.id])

  async function handleSave() {
    if (!id) return
    if (!name.trim()) { setError('Ange ett namn.'); return }
    setError(null)
    try {
      await save({
        id: Number(id),
        name: name.trim(),
        startdate: startdate || null,
        enddate: enddate || null,
        location: location || null,
        difficulty: difficulty || null,
        playtime: playtime !== '' ? Number(playtime) : null,
        periods: periods !== '' ? Number(periods) : null,
        matchplayers: matchplayers || null,
        indooroutdoor: indoor || null,
        svenskalag: svenskalag || null,
        cupsite: cupsite || null,
        status,
      })
      router.push(`/cups/${id}`)
    } catch (e) {
     setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
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
        <h1 className="text-lg font-bold text-[#FFCF08]">Redigera cup</h1>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5">
        <Section title="Grundinfo">
          <Field label="Namn">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Cupens namn" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Startdatum">
              <Input type="date" value={startdate} onChange={e => setStartdate(e.target.value)} />
            </Field>
            <Field label="Slutdatum">
              <Input type="date" value={enddate} onChange={e => setEnddate(e.target.value)} />
            </Field>
          </div>

          <Field label="Plats">
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ort / arena" />
          </Field>

          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Speldetaljer">
          <Field label="Spelform">
       <Select
              value={matchplayers || '__none__'}
              onValueChange={v => setMatchplayers(v === '__none__' ? '' : v)}
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
              <Input type="number" min={0} value={playtime} onChange={e => setPlaytime(e.target.value)} />
            </Field>
            <Field label="Perioder">
              <Input type="number" min={0} value={periods} onChange={e => setPeriods(e.target.value)} />
            </Field>
          </div>

          <Field label="Nivå">
            <Select
              value={difficulty || '__none__'}
              onValueChange={v => setDifficulty(v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Välj nivå…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">–</SelectItem>
                {DIFFICULTIES.map(d => (
                  <SelectItem key={d} value={d}>
                    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded" style={rankStyle(d)}>
                      {d}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Section>

     <Section title="Länkar">
          <Field label="Svenskalag">
            <Input value={svenskalag} onChange={e => setSvenskalag(e.target.value)} placeholder="https://svenskalag.se/…" />
          </Field>
          <Field label="Cupsite">
            <Input value={cupsite} onChange={e => setCupsite(e.target.value)} placeholder="https://…" />
          </Field>
        </Section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#106A37', color: '#FFCF08' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Sparar…' : 'Spara'}
        </Button>

        <div className="h-4" />
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
