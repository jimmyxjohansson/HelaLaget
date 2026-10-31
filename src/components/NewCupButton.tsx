'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { useCreateCup } from '../hooks/backend/cups'
import { Button } from '../lib/shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../lib/shadcn/dialog'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import DatePicker from './DatePicker'

/** Skapa en ny cup och gå till den. */
export default function NewCupButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', startdate: '', enddate: '', location: '' })
  const { trigger, loading } = useCreateCup()

  async function save() {
    setError(null)
    try {
      const res = await trigger({
        name: form.name,
        startdate: form.startdate,
        enddate: form.enddate || null,
        location: form.location || null,
      })
      setOpen(false)
      router.push(`/cups/${res.id}/edit`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="bg-transparent border-team-accent/40 text-team-accent hover:bg-team-accent/10 hover:text-team-accent"
        onClick={() => setOpen(true)}
      >
        <Plus /> Ny cup
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ny cup</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nc-name">Namn</Label>
              <Input id="nc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor="nc-start">Startdatum</Label>
                <DatePicker id="nc-start" value={form.startdate} onChange={(v) => setForm({ ...form, startdate: v })} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor="nc-end">Slutdatum</Label>
                <DatePicker id="nc-end" value={form.enddate} onChange={(v) => setForm({ ...form, enddate: v })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nc-loc">Plats</Label>
              <Input id="nc-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Övriga uppgifter fyller du i på nästa sida.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={save} disabled={loading || !form.name.trim() || !form.startdate}>
              {loading && <Loader2 className="animate-spin" />}
              Skapa cup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
