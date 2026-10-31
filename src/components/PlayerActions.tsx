'use client'

import { useState } from 'react'
import { Loader2, Plus, UserPlus } from 'lucide-react'
import { useAddPlayersToSquad, useCreatePlayer, useGetOrganizationPlayers } from '../hooks/backend/players'
import { Button } from '../lib/shadcn/button'
import { Checkbox } from '../lib/shadcn/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../lib/shadcn/dialog'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import DatePicker from './DatePicker'

/** Ny spelare, eller hämta spelare från föreningens andra lag (t.ex. lån). */
export default function PlayerActions({ onChanged }: { onChanged: () => void }) {
  const [mode, setMode] = useState<'new' | 'org' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ firstname: '', lastname: '', number: '', birthdate: '' })
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const create = useCreatePlayer()
  const orgPlayers = useGetOrganizationPlayers()
  const add = useAddPlayersToSquad()

  function close() {
    setMode(null)
    setError(null)
    setForm({ firstname: '', lastname: '', number: '', birthdate: '' })
    setSelected([])
    setSearch('')
  }

  async function save() {
    setError(null)
    try {
      if (mode === 'new') {
        await create.trigger({
          firstname: form.firstname,
          lastname: form.lastname || null,
          number: form.number ? Number(form.number) : null,
          birthdate: form.birthdate || null,
        })
      } else {
        await add.trigger({ playerIds: selected })
      }
      close()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  const list = (orgPlayers.data ?? []).filter((p) =>
    `${p.firstname ?? ''} ${p.lastname ?? ''} ${p.shortname ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent border-team-accent/40 text-team-accent hover:bg-team-accent/10 hover:text-team-accent"
          onClick={() => {
            setMode('org')
            orgPlayers.trigger().catch((e: Error) => setError(e.message))
          }}
        >
          <UserPlus /> Från föreningen
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent border-team-accent/40 text-team-accent hover:bg-team-accent/10 hover:text-team-accent"
          onClick={() => setMode('new')}
        >
          <Plus /> Ny
        </Button>
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'new' ? 'Ny spelare' : 'Hämta från föreningen'}</DialogTitle>
          </DialogHeader>

          {mode === 'new' ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label htmlFor="np-first">Förnamn</Label>
                  <Input id="np-first" value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label htmlFor="np-last">Efternamn</Label>
                  <Input id="np-last" value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-24 flex flex-col gap-1.5">
                  <Label htmlFor="np-number">Nummer</Label>
                  <Input id="np-number" inputMode="numeric" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label htmlFor="np-birth">Födelsedatum</Label>
                  <DatePicker id="np-birth" value={form.birthdate} onChange={(v) => setForm({ ...form, birthdate: v })} fromYear={new Date().getFullYear() - 80} toYear={new Date().getFullYear()} placeholder="Välj" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Fler uppgifter, som position och bild, fyller du i på spelarens sida.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Spelare i föreningens andra lag. De du väljer blir med i det här laget också.
              </p>
              <Input placeholder="Sök" value={search} onChange={(e) => setSearch(e.target.value)} />
              {orgPlayers.loading && !orgPlayers.data ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : list.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga fler spelare i föreningen.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border max-h-80 overflow-y-auto">
                  {list.map((p) => (
                    <li key={p.id}>
                      <label className="flex items-center gap-3 py-2 cursor-pointer">
                        <Checkbox
                          checked={selected.includes(p.id)}
                          onCheckedChange={(c) =>
                            setSelected((s) => (c ? [...s, p.id] : s.filter((id) => id !== p.id)))
                          }
                        />
                        <span className="flex-1 text-sm">
                          {[p.firstname, p.lastname].filter(Boolean).join(' ') || p.shortname}
                          {p.number ? <span className="text-muted-foreground"> #{p.number}</span> : null}
                        </span>
                        <span className="text-xs text-muted-foreground">{p.squads ?? 'inget lag'}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              onClick={save}
              disabled={
                create.loading || add.loading || (mode === 'new' ? !form.firstname.trim() : selected.length === 0)
              }
            >
              {(create.loading || add.loading) && <Loader2 className="animate-spin" />}
              {mode === 'new' ? 'Skapa spelare' : `Lägg till ${selected.length || ''}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
