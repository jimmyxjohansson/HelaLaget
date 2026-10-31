'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../lib/shadcn/dialog'
import { Button } from '../../lib/shadcn/button'
import { Label } from '../../lib/shadcn/label'
import { Input } from '../../lib/shadcn/input'
import { Textarea } from '../../lib/shadcn/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../lib/shadcn/select'
import { useCreateTraining } from '../../hooks/backend/trainings'
import { useUpdateTraining } from '../../hooks/backend/trainings'
import DateTimePicker from '../../components/DateTimePicker'

export interface TrainingFormData {
  id?: number
  type: string
  date: string   // ISO timestamptz string
  indooroutdoor: string
  notes: string | null
  svenskalag: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  initial?: TrainingFormData | null
}

const TYPES = ['Träning', 'Extra', 'Coerver', 'Målvaktsträning']
const LOCATIONS = ['Inomhus', 'Utomhus']

/** Extract YYYY-MM-DD from a UTC ISO string */
function toDateInput(iso: string) {
  return iso.slice(0, 10)
}

/** Extract HH:MM from a UTC ISO string */
function toTimeInput(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function TrainingForm({ open, onClose, onSaved, initial }: Props) {
  const isEdit = Boolean(initial?.id)

  const [type, setType] = useState('Träning')
  const [dateVal, setDateVal] = useState('')
  const [location, setLocation] = useState('Inomhus')
  const [notes, setNotes] = useState('')
  const [svenskalag, setSvenskalag] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { loading: creating, trigger: create } = useCreateTraining()
  const { loading: updating, trigger: update } = useUpdateTraining()
  const saving = creating || updating

  // Populate form when opening for edit
  useEffect(() => {
    if (open) {
      if (initial) {
        setType(initial.type)
        setDateVal(`${toDateInput(initial.date)}T${toTimeInput(initial.date)}`)
        setLocation(initial.indooroutdoor)
        setNotes(initial.notes ?? '')
        setSvenskalag(initial.svenskalag ?? '')
      } else {
        setType('Träning')
        setDateVal('')
        setLocation('Utomhus')
        setNotes('')
        setSvenskalag('')
      }
      setError(null)
    }
  }, [open, initial])

  async function handleSave() {
    if (!dateVal) { setError('Välj datum och tid.'); return }
    setError(null)
    const isoDate = `${dateVal}:00Z`
    try {
      if (isEdit && initial?.id) {
        await update({ id: initial.id, type, date: isoDate, indooroutdoor: location, notes: notes || undefined, svenskalag: svenskalag || null })
      } else {
        await create({ type, date: isoDate, indooroutdoor: location, notes: notes || undefined, svenskalag: svenskalag || null })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Redigera träning' : 'Ny träning'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & time */}
          <div className="flex flex-col gap-1.5">
            <Label>Datum & tid</Label>
            <DateTimePicker value={dateVal} onChange={setDateVal} />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <Label>Plats</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Svenskalag */}
          <div className="flex flex-col gap-1.5">
            <Label>Svenskalag</Label>
            <Input
              type="url"
              placeholder="https://svenskalag.se/…"
              value={svenskalag}
              onChange={e => setSvenskalag(e.target.value)}
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

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Sparar...' : isEdit ? 'Spara' : 'Skapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
