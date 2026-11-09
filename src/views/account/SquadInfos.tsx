'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Bold, Eye, Italic, List, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { cn } from '../../lib/shadcn/utils'
import { useDeleteSquadInfo, useGetSquadInfos, useMoveSquadInfo, useSaveSquadInfo } from '../../hooks/backend/infos'
import RichText from '../../components/info/RichText'
import { Section } from './shared'
import type { SquadInfo } from '@/server/functions/infos/getSquadInfos'

type Draft = {
  id: number | null; title: string; body: string; onTrainings: boolean; onMatches: boolean; audience: 'leaders' | 'all'
  onlyIndoorOutdoor: 'Inomhus' | 'Utomhus' | null; onlyHomeAway: 'Hemma' | 'Borta' | null
}
const EMPTY: Draft = { id: null, title: '', body: '', onTrainings: true, onMatches: false, audience: 'leaders', onlyIndoorOutdoor: null, onlyHomeAway: null }

/** Laginställningar: information som visas på träningar och/eller matcher, t.ex. koder. */
export default function SquadInfos() {
  const list = useGetSquadInfos()
  const del = useDeleteSquadInfo()
  const move = useMoveSquadInfo()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => list.trigger({ context: null }, { skipCache: true }).catch((e: Error) => setError(e.message))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const infos = list.data ?? []

  async function remove(i: SquadInfo) {
    if (!window.confirm(`Ta bort "${i.title}"?`)) return
    setError(null)
    try { await del.trigger({ id: i.id }); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte ta bort.') }
  }

  async function reorder(index: number, dir: -1 | 1) {
    const ids = infos.map((i) => i.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    try { await move.trigger({ ids }); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte flytta.') }
  }

  return (
    <Section title="Information på träningar och matcher"
      action={<Button size="sm" variant="outline" onClick={() => setDraft(EMPTY)}><Plus /> Ny</Button>}>
      <p className="mb-3 text-sm text-muted-foreground">
        Till exempel koder till förråd och bolltunna. Visas bakom knappen <b>ⓘ</b> på träningar och matcher.
      </p>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      {!list.data ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : infos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen information än.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {infos.map((i, idx) => (
            <li key={i.id} className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.title}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {i.onTrainings && <Chip>Träningar</Chip>}
                    {i.onMatches && <Chip>Matcher</Chip>}
                    {!i.onTrainings && !i.onMatches && <Chip muted>Visas inte</Chip>}
                    {i.onlyIndoorOutdoor && <Chip>Bara {i.onlyIndoorOutdoor.toLowerCase()}</Chip>}
                    {i.onlyHomeAway && i.onMatches && <Chip>Bara {i.onlyHomeAway === 'Hemma' ? 'hemmamatcher' : 'bortamatcher'}</Chip>}
                    <Chip muted>{i.audience === 'all' ? 'Alla i laget' : 'Bara ledare'}</Chip>
                  </div>
                  {i.body.trim() && <RichText text={i.body} className="mt-1.5 line-clamp-3 text-muted-foreground" />}
                </div>
                <div className="flex shrink-0 items-center">
                  <IconBtn label="Flytta upp" disabled={idx === 0} onClick={() => reorder(idx, -1)}><ArrowUp className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Flytta ner" disabled={idx === infos.length - 1} onClick={() => reorder(idx, 1)}><ArrowDown className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Redigera" onClick={() => setDraft({ ...i })}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Ta bort" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <InfoEditor draft={draft} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); load() }} />
    </Section>
  )
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', muted ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>{children}</span>
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
      {children}
    </button>
  )
}

function InfoEditor({ draft, onClose, onSaved }: { draft: Draft | null; onClose: () => void; onSaved: () => void }) {
  const save = useSaveSquadInfo()
  const [d, setD] = useState<Draft>(EMPTY)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (draft) { setD(draft); setPreview(false); setError(null) } }, [draft])

  // Lägger formatering runt markerad text, eller "- " först på markerade rader
  function wrap(kind: 'bold' | 'italic' | 'list') {
    const el = area.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b, value } = el
    let next: string
    let cursor: [number, number]
    if (kind === 'list') {
      const start = value.lastIndexOf('\n', a - 1) + 1
      const lines = value.slice(start, b).split('\n').map((l) => (l.startsWith('- ') ? l : `- ${l}`)).join('\n')
      next = value.slice(0, start) + lines + value.slice(b)
      cursor = [start, start + lines.length]
    } else {
      const mark = kind === 'bold' ? '**' : '*'
      const sel = value.slice(a, b) || (kind === 'bold' ? 'fet text' : 'kursiv text')
      next = value.slice(0, a) + mark + sel + mark + value.slice(b)
      cursor = [a + mark.length, a + mark.length + sel.length]
    }
    setD((x) => ({ ...x, body: next }))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor[0], cursor[1]) })
  }

  async function submit() {
    setError(null)
    try {
      await save.trigger(d)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara.')
    }
  }

  const toolBtn = 'flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted'
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[520px] overflow-y-auto px-4">
        <DialogHeader><DialogTitle>{d.id ? 'Redigera information' : 'Ny information'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Rubrik</span>
            <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={80} placeholder="T.ex. Koder"
              className="h-9 rounded-md border border-border bg-background px-2" />
          </label>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="mr-auto text-xs text-muted-foreground">Text</span>
              <button type="button" className={toolBtn} onClick={() => wrap('bold')} aria-label="Fet" title="Fet" disabled={preview}><Bold className="h-4 w-4" /></button>
              <button type="button" className={toolBtn} onClick={() => wrap('italic')} aria-label="Kursiv" title="Kursiv" disabled={preview}><Italic className="h-4 w-4" /></button>
              <button type="button" className={toolBtn} onClick={() => wrap('list')} aria-label="Punktlista" title="Punktlista" disabled={preview}><List className="h-4 w-4" /></button>
              <button type="button" onClick={() => setPreview(!preview)} aria-pressed={preview}
                className={cn('flex h-8 items-center gap-1 rounded-md px-2 text-xs', preview ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <Eye className="h-4 w-4" /> Förhandsvisa
              </button>
            </div>
            {preview ? (
              <div className="min-h-[140px] rounded-md border border-border bg-card px-3 py-2">
                {d.body.trim() ? <RichText text={d.body} /> : <p className="text-muted-foreground">Ingen text.</p>}
              </div>
            ) : (
              <textarea ref={area} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} rows={7} maxLength={4000}
                placeholder={'- Förråd: **4153**\n- Bolltunna: **0914**'}
                className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[13px]" />
            )}
            <p className="text-[11px] text-muted-foreground">**fet**, *kursiv*, rader som börjar med "- " blir en lista. Länkar blir klickbara.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Visas på</span>
            <label className="flex items-center gap-2"><input type="checkbox" checked={d.onTrainings} onChange={(e) => setD({ ...d, onTrainings: e.target.checked })} /> Träningar</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={d.onMatches} onChange={(e) => setD({ ...d, onMatches: e.target.checked })} /> Matcher</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Inomhus/utomhus</span>
              <select value={d.onlyIndoorOutdoor ?? ''} onChange={(e) => setD({ ...d, onlyIndoorOutdoor: (e.target.value || null) as Draft['onlyIndoorOutdoor'] })}
                className="h-9 rounded-md border border-border bg-background px-2">
                <option value="">Båda</option>
                <option value="Inomhus">Bara inomhus</option>
                <option value="Utomhus">Bara utomhus</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Hemma/borta (matcher)</span>
              <select value={d.onlyHomeAway ?? ''} disabled={!d.onMatches}
                onChange={(e) => setD({ ...d, onlyHomeAway: (e.target.value || null) as Draft['onlyHomeAway'] })}
                className="h-9 rounded-md border border-border bg-background px-2 disabled:opacity-50">
                <option value="">Båda</option>
                <option value="Hemma">Bara hemmamatcher</option>
                <option value="Borta">Bara bortamatcher</option>
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Vem ser den</span>
            <label className="flex items-center gap-2"><input type="radio" checked={d.audience === 'leaders'} onChange={() => setD({ ...d, audience: 'leaders' })} /> Bara ledare och admin</label>
            <label className="flex items-center gap-2"><input type="radio" checked={d.audience === 'all'} onChange={() => setD({ ...d, audience: 'all' })} /> Alla i laget, även spelare och anhöriga</label>
          </div>
          {error && <p className="text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Avbryt</Button>
            <Button onClick={submit} disabled={save.loading}>{save.loading && <Loader2 className="animate-spin" />} Spara</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
