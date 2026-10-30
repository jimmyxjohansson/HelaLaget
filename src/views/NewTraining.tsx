'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { useCreateTraining } from '../hooks/backend/trainings'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/shadcn/select'

const TYPES = ['Träning', 'Extra', 'Coerver', 'Målvaktsträning']
const LOCATIONS = ['Inomhus', 'Utomhus']

export default function NewTraining() {
  const router = useRouter()
  const { loading: creating, trigger: create } = useCreateTraining()

  const [type, setType] = useState('Träning')
  const [dateVal, setDateVal] = useState('')
  const [location, setLocation] = useState('Utomhus')
  const [notes, setNotes] = useState('')
  const [svenskalag, setSvenskalag] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!dateVal) { setError('Välj datum och tid.'); return }
    setError(null)
    const isoDate = `${dateVal}:00Z`
    try {
      const res = (await create({
        type,
        date: isoDate,
        indooroutdoor: location,
        ...(notes ? { notes } : {}),
        svenskalag: svenskalag || null,
      })) as unknown as { id?: number } | undefined
      if (res?.id) {
        router.push(`/trainings/${res.id}`)
      } else {
        router.push('/trainings')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

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
        <h1 className="text-lg font-bold text-team-accent">Ny träning</h1>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-5">
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & time */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Datum & tid</Label>
            <Input
              type="datetime-local"
              value={dateVal}
              onChange={e => setDateVal(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Plats</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Svenskalag */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Svenskalag</Label>
            <Input
              type="url"
              placeholder="https://svenskalag.se/…"
              value={svenskalag}
              onChange={e => setSvenskalag(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Anteckningar</Label>
            <Textarea
              placeholder="Valfria anteckningar..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSave}
          disabled={creating}
          className="w-full"
          style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {creating ? 'Sparar…' : 'Skapa träning'}
        </Button>

        <div className="h-4" />
      </div>
    </div>
  )
}
