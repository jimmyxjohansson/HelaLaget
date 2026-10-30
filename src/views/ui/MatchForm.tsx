'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../lib/shadcn/dialog'
import { Button } from '../../lib/shadcn/button'
import { Label } from '../../lib/shadcn/label'
import { Input } from '../../lib/shadcn/input'
import { Textarea } from '../../lib/shadcn/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../lib/shadcn/select'
import { Combobox } from '../../lib/shadcn/combobox'
import { useCreateMatch, useGetTeamsAndLeagues } from '../../hooks/backend/matches'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (id: number) => void
}

const TYPES = ['Serie', 'Cup', 'Träning']
const HOMEAWAY = ['Hemma', 'Borta']
const LOCATIONS = ['Inomhus', 'Utomhus']

function toIso(datetime: string) {
  return `${datetime}:00Z`
}

export default function MatchForm({ open, onClose, onCreated }: Props) {
  const { loading: creating, trigger: create } = useCreateMatch()
  const { data: refData, trigger: fetchRefs } = useGetTeamsAndLeagues()

  const [matchtype, setMatchtype] = useState('Serie')
  const [dateVal, setDateVal] = useState('')
  const [homeaway, setHomeaway] = useState('Hemma')
  const [indoor, setIndoor] = useState('Utomhus')
  const [vs, setVs] = useState('')
  const [league, setLeague] = useState('')
  const [teamname, setTeamname] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refs = refData as unknown as { teams: { id: number; team: string }[]; leagues: { id: number; name: string }[] } | undefined
  const teams = refs?.teams ?? []
  const leagues = refs?.leagues ?? []

  // Load teams/leagues once
  useEffect(() => {
    if (open) fetchRefs({})
  }, [open])

  // Reset form on open
  useEffect(() => {
    if (open) {
      setMatchtype('Serie')
      setDateVal('')
      setHomeaway('Hemma')
      setIndoor('Utomhus')
      setVs('')
      setLeague('')
      setTeamname('')
      setLocation('')
      setNotes('')
      setError(null)
    }
  }, [open])

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
        league: league ? Number(league) : null,
        notes: notes || null,
      })) as unknown as { id?: number } | undefined
      if (res?.id) {
        onCreated(res.id)
        onClose()
      } else {
        setError('Kunde inte skapa matchen.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny match</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Typ</Label>
            <Select value={matchtype} onValueChange={setMatchtype}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date & time */}
          <div className="flex flex-col gap-1.5">
            <Label>Datum & tid</Label>
            <Input type="datetime-local" value={dateVal} onChange={e => setDateVal(e.target.value)} />
          </div>

          {/* Home / Away */}
          <div className="flex flex-col gap-1.5">
            <Label>Hemma / Borta</Label>
            <Select value={homeaway} onValueChange={setHomeaway}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOMEAWAY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Opponent */}
          <div className="flex flex-col gap-1.5">
            <Label>Motståndare</Label>
            <Combobox
              options={teams.map(t => ({ value: String(t.id), label: t.team }))}
              value={vs}
              onValueChange={setVs}
              placeholder="Välj motståndare..."
              emptyMessage="Inga lag hittades."
            />
          </div>

          {/* League (only for Serie/Cup) */}
          {matchtype !== 'Träning' && (
            <div className="flex flex-col gap-1.5">
              <Label>Serie / Cup</Label>
              <Combobox
                options={leagues.map(l => ({ value: String(l.id), label: l.name }))}
                value={league}
                onValueChange={setLeague}
                placeholder="Välj serie/cup..."
                emptyMessage="Inga hittades."
              />
            </div>
          )}

          {/* Team name */}
          <div className="flex flex-col gap-1.5">
            <Label>Lagnamn</Label>
            <Input
              placeholder="t.ex. Skabersjö IF:Svart"
              value={teamname}
              onChange={e => setTeamname(e.target.value)}
            />
          </div>

          {/* Indoor / Outdoor */}
          <div className="flex flex-col gap-1.5">
            <Label>Inomhus / Utomhus</Label>
            <Select value={indoor} onValueChange={setIndoor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <Label>Plats</Label>
            <Input
              placeholder="Plats / adress"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label>Anteckningar</Label>
            <Textarea
              placeholder="Valfria anteckningar..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>Avbryt</Button>
          <Button onClick={handleSave} disabled={creating}>
            {creating ? 'Sparar...' : 'Skapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
