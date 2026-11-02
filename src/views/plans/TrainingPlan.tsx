'use client'

import Link, { useRouter } from '../../lib/nav'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ChevronDown, ClipboardList, Clock, ExternalLink,
  LayoutTemplate, Loader2, Pencil, Plus, Send, Trash2, X,
} from 'lucide-react'
import { useGetTrainingDetail } from '../../hooks/backend/trainings'
import { useGetDrills } from '../../hooks/backend/drills'
import { useDeletePlanTemplate, useGetPlanTemplates, useGetTrainingPlan, useNotifyTrainingPlan, useSavePlanTemplate, useSaveTrainingPlan } from '../../hooks/backend/plans'
import DrillDiagram from '../../components/drills/DrillDiagram'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { Button } from '../../lib/shadcn/button'
import { canEdit } from '../../lib/squad-store'
import { cn } from '../../lib/shadcn/utils'
import { LEVELS, isDiagram, type Diagram } from '../../utils/diagram'
import { BLOCK_NAMES, LEVEL_COLOR } from '../../utils/drills'
import { TRAINING_GROUPS } from '../../utils/trainingGroups'
import { DrillFacts } from '../drills/shared'
import DrillPicker from './DrillPicker'
import type { DrillListItem } from '../drills/DrillBank'

/** Det vi behöver veta om en övning i planen. */
type DrillInfo = {
  id: number
  name: string
  summary: string | null
  coaching: string | null
  description: string | null
  durationMinutes: number | null
  area: string | null
  equipment: string | null
  intensity: string | null
  diagram: unknown | null
  levels: Record<string, { text?: string | null; diagram?: unknown | null } | undefined> | null
}

type Item = { key: string; groupName: string | null; drillId: number | null; title: string; level: string | null; notes: string; drill: DrillInfo | null }
type Block = { key: string; name: string; minutes: string; notes: string; items: Item[] }

const GROUP_OPTIONS = [...TRAINING_GROUPS, 'Station 1', 'Station 2', 'Station 3', 'Station 4']

let keyCounter = 0
const k = () => `k${++keyCounter}`

function toInfo(d: DrillListItem): DrillInfo {
  return {
    id: d.id, name: d.name, summary: d.summary, coaching: d.coaching, description: d.description,
    durationMinutes: d.durationMinutes, area: d.area, equipment: d.equipment, intensity: d.intensity,
    diagram: d.diagram, levels: d.levels as DrillInfo['levels'],
  }
}

/** Tider sparas som väggklocka i UTC: "17:30". */
function clock(iso: string, plusMinutes: number) {
  const d = new Date(new Date(iso).getTime() + plusMinutes * 60_000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

function dateTitle(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

const blockMinutes = (b: Block) => {
  const n = Number(b.minutes)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Träningsplan för ett pass: block i tidsordning med övningar per grupp. */
export default function TrainingPlan() {
  const { id } = useParams<{ id: string }>()
  const trainingId = Number(id)
  const router = useRouter()
  const editor = canEdit()
  const detail = useGetTrainingDetail()
  const plan = useGetTrainingPlan()
  const drills = useGetDrills()
  const savePlan = useSaveTrainingPlan()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [editing, setEditing] = useState(false)
  const notify = useNotifyTrainingPlan()
  const [notice, setNotice] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [picker, setPicker] = useState<{ block: string; item: string } | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  async function load() {
    const data = await plan.trigger({ trainingId })
    const next: Block[] = data.map((b) => ({
      key: k(), name: b.name, minutes: b.minutes != null ? String(b.minutes) : '', notes: b.notes ?? '',
      items: b.items.map((i) => ({
        key: k(), groupName: i.groupName, drillId: i.drillId, title: i.title ?? '', level: i.level, notes: i.notes ?? '',
        drill: i.drillId && i.drillName ? {
          id: i.drillId, name: i.drillName, summary: i.summary, coaching: i.coaching, description: i.description,
          durationMinutes: i.durationMinutes, area: i.area, equipment: i.equipment, intensity: i.intensity,
          diagram: i.diagram, levels: i.levels,
        } : null,
      })),
    }))
    setBlocks(next)
    setDirty(false)
    return next
  }

  useEffect(() => {
    detail.trigger({ trainingId }).catch(() => {})
    load().then((b) => { if (b.length === 0 && editor) startEditing() }).catch(() => setError('Kunde inte hämta planen.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId])

  function startEditing() {
    setEditing(true)
    if (!drills.data) drills.trigger().catch(() => {})
  }

  // Grupper som har spelare på passet, för att föreslå dem i planen
  const usedGroups = useMemo(() => {
    const set = new Set((detail.data?.attendees ?? []).map((a) => a.group_name).filter((g): g is string => !!g))
    return GROUP_OPTIONS.filter((g) => set.has(g))
  }, [detail.data])
  const groupCount = (g: string) => (detail.data?.attendees ?? []).filter((a) => a.group_name === g && ['Närvarande', 'Anmäld', 'Närvarande, ej hela', 'Kallad'].includes(a.status)).length

  const total = blocks.reduce((a, b) => a + blockMinutes(b), 0)
  const training = detail.data?.training

  function change(fn: (b: Block[]) => Block[]) {
    setBlocks((prev) => fn(prev))
    setDirty(true)
    setSavedAt(null)
  }
  const updateBlock = (key: string, patch: Partial<Block>) => change((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)))
  const updateItem = (bk: string, ik: string, patch: Partial<Item>) =>
    change((bs) => bs.map((b) => (b.key === bk ? { ...b, items: b.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) } : b)))
  function addBlock(name: string) {
    change((bs) => [...bs, { key: k(), name, minutes: name === 'Vattenpaus' ? '3' : '', notes: '', items: name === 'Vattenpaus' ? [] : [newItem(null)] }])
  }
  function newItem(group: string | null): Item {
    return { key: k(), groupName: group, drillId: null, title: '', level: null, notes: '', drill: null }
  }
  function addItem(b: Block) {
    // Nästa grupp som inte används i blocket
    if (b.items.length === 0) return updateBlock(b.key, { items: [newItem(null)] })
    const groups = usedGroups.length > 1 ? usedGroups : GROUP_OPTIONS
    // Första raden gällde alla: ge den första gruppen
    const items = b.items.length === 1 && b.items[0].groupName == null ? [{ ...b.items[0], groupName: groups[0] }] : b.items
    const taken = new Set(items.map((i) => i.groupName))
    const next = groups.find((g) => !taken.has(g)) ?? null
    updateBlock(b.key, { items: [...items, newItem(next)] })
  }
  function move(i: number, dir: -1 | 1) {
    change((bs) => {
      const j = i + dir
      if (j < 0 || j >= bs.length) return bs
      const copy = [...bs]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }
  function pick(d: DrillListItem) {
    if (!picker) return
    const b = blocks.find((x) => x.key === picker.block)
    updateItem(picker.block, picker.item, { drillId: d.id, drill: toInfo(d), title: '' })
    if (b && !b.minutes && d.durationMinutes) updateBlock(b.key, { minutes: String(d.durationMinutes) })
    setPicker(null)
  }

  function payload() {
    return blocks.map((b) => ({
      name: b.name.trim() || 'Block',
      minutes: b.minutes ? Number(b.minutes) : null,
      notes: b.notes,
      items: b.items.map((i) => ({ groupName: i.groupName, drillId: i.drillId, title: i.title, level: i.level, notes: i.notes })),
    }))
  }

  async function save() {
    setError(null)
    try {
      await savePlan.trigger({ trainingId, blocks: payload() })
      await load()
      setSavedAt(Date.now())
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara.')
    }
  }

  async function sendToLeaders() {
    if (!window.confirm('Skicka en notis till lagets ledare om att träningsplanen är klar?')) return
    setError(null)
    setNotice(null)
    try {
      const r = await notify.trigger({ trainingId })
      setNotice(r.people > 0
        ? `Notisen är skickad till ${r.people} ledare.`
        : 'Ingen ledare har notiser påslagna för laget, så ingen notis skickades. Slå på dem under Mer → Notiser.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte skicka notisen.')
    }
  }

  function applyTemplate(tblocks: TemplateBlocks) {
    const byId = new Map((drills.data ?? []).map((d) => [d.id, d]))
    change(() => tblocks.map((b) => ({
      key: k(), name: b.name, minutes: b.minutes != null ? String(b.minutes) : '', notes: b.notes ?? '',
      items: b.items.map((i) => {
        const d = i.drillId ? byId.get(i.drillId) : undefined
        return {
          key: k(), groupName: i.groupName ?? null, drillId: d ? d.id : null, title: i.title ?? '', level: i.level ?? null, notes: i.notes ?? '',
          drill: d ? toInfo(d) : null,
        }
      }),
    })))
    setEditing(true)
    setTemplatesOpen(false)
  }

  return (
    <div className="flex flex-col pb-24">
      <div className="px-4 pb-4 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-team-accent/80">
            <ArrowLeft className="h-4 w-4" /> Tillbaka
          </button>
          {editor && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setTemplatesOpen(true); if (!drills.data) drills.trigger().catch(() => {}) }}
                className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-sm hover:bg-primary-foreground/30">
                <LayoutTemplate className="h-4 w-4" /> Mallar
              </button>
              {!editing && blocks.length > 0 && (
                <button onClick={sendToLeaders} disabled={notify.loading} title="Skicka notis till lagets ledare om att planen är klar"
                  aria-label="Skicka till ledare"
                  className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-2 py-1.5 text-sm hover:bg-primary-foreground/30 disabled:opacity-60 sm:px-3">
                  {notify.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="hidden sm:inline">Skicka till ledare</span>
                </button>
              )}
              {!editing && (
                <button onClick={startEditing} className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-sm hover:bg-primary-foreground/30">
                  <Pencil className="h-4 w-4" /> Redigera
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-sm font-medium uppercase tracking-widest text-team-accent/70">Träningsplan</p>
        <h1 className="text-2xl font-bold first-letter:uppercase">{training ? dateTitle(training.date) : ' '}</h1>
        <p className="mt-0.5 flex items-center gap-3 text-sm text-team-accent/80">
          {training && <span>{clock(training.date, 0)}–{clock(training.date, total)}</span>}
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {total} min</span>
          <span>{blocks.length} block</span>
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-3 md:p-4">
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {savedAt && !editing && <p className="flex items-center gap-1.5 text-sm text-green-600"><Check className="h-4 w-4" /> Planen är sparad</p>}
        {notice && !editing && <p className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm"><Send className="h-4 w-4 shrink-0" /> {notice}</p>}
        {!plan.data && plan.loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        ) : editing ? (
          <>
            {blocks.map((b, bi) => (
              <BlockEditor
                key={b.key}
                b={b}
                start={training ? clock(training.date, blocks.slice(0, bi).reduce((a, x) => a + blockMinutes(x), 0)) : null}
                first={bi === 0}
                last={bi === blocks.length - 1}
                groups={usedGroups}
                groupCount={groupCount}
                onChange={(patch) => updateBlock(b.key, patch)}
                onItem={(ik, patch) => updateItem(b.key, ik, patch)}
                onRemoveItem={(ik) => updateBlock(b.key, { items: b.items.filter((i) => i.key !== ik) })}
                onAddItem={() => addItem(b)}
                onPick={(ik) => { setPicker({ block: b.key, item: ik }); if (!drills.data) drills.trigger().catch(() => {}) }}
                onMove={(dir) => move(bi, dir)}
                onRemove={() => change((bs) => bs.filter((x) => x.key !== b.key))}
              />
            ))}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-border p-3">
              <span className="mr-1 flex items-center gap-1 text-sm font-medium"><Plus className="h-4 w-4" /> Nytt block</span>
              {BLOCK_NAMES.map((n) => (
                <button key={n} type="button" onClick={() => addBlock(n)} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70">{n}</button>
              ))}
            </div>
            {blocks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Bygg passet block för block, eller börja från en sparad mall. Övningarna hämtas från <Link href="/ovningar" className="text-primary underline-offset-4 hover:underline">övningsbanken</Link>.
              </p>
            )}
          </>
        ) : blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Det finns ingen träningsplan för passet ännu.</p>
            {editor && <Button onClick={startEditing}><Plus /> Planera passet</Button>}
          </div>
        ) : (
          blocks.map((b, bi) => (
            <BlockView key={b.key} b={b} start={training ? clock(training.date, blocks.slice(0, bi).reduce((a, x) => a + blockMinutes(x), 0)) : null} groupCount={groupCount} />
          ))
        )}
      </div>

      {editing && (
        <div className="fixed inset-x-0 bottom-[calc(56px_+_env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-2 backdrop-blur md:sticky md:bottom-0">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <span className="text-sm text-muted-foreground">Totalt <b className="text-foreground">{total} min</b></span>
            <span className="ml-auto" />
            <Button type="button" variant="outline" onClick={() => { if (!dirty || window.confirm('Släppa ändringarna?')) { load().catch(() => {}); setEditing(false) } }}>Avbryt</Button>
            <Button type="button" onClick={save} disabled={savePlan.loading}>
              {savePlan.loading ? <Loader2 className="animate-spin" /> : <Check />} Spara
            </Button>
          </div>
        </div>
      )}

      <DrillPicker open={!!picker} drills={drills.data} onClose={() => setPicker(null)} onPick={pick} />
      <TemplatesDialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} current={payload()} onApply={applyTemplate} />
    </div>
  )
}

/* ───────────── Redigering ───────────── */

function BlockEditor({ b, start, first, last, groups, groupCount, onChange, onItem, onRemoveItem, onAddItem, onPick, onMove, onRemove }: {
  b: Block
  start: string | null
  first: boolean
  last: boolean
  groups: string[]
  groupCount: (g: string) => number
  onChange: (patch: Partial<Block>) => void
  onItem: (key: string, patch: Partial<Item>) => void
  onRemoveItem: (key: string) => void
  onAddItem: () => void
  onPick: (key: string) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30'
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        {start && <span className="w-11 text-xs tabular-nums text-muted-foreground">{start}</span>}
        <input value={b.name} onChange={(e) => onChange({ name: e.target.value })} list="block-names" maxLength={60}
          className="h-8 min-w-[150px] flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-border focus:border-border focus:outline-none" />
        <datalist id="block-names">{BLOCK_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="number" min={0} max={240} value={b.minutes} onChange={(e) => onChange({ minutes: e.target.value })}
            className="h-8 w-14 rounded-md border border-border bg-background px-2 text-sm text-foreground" /> min
        </label>
        <span className="flex">
          <button type="button" className={iconBtn} onClick={() => onMove(-1)} disabled={first} aria-label="Flytta upp"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" className={iconBtn} onClick={() => onMove(1)} disabled={last} aria-label="Flytta ner"><ArrowDown className="h-4 w-4" /></button>
          <button type="button" className={cn(iconBtn, 'text-destructive')} onClick={onRemove} aria-label="Ta bort blocket"><Trash2 className="h-4 w-4" /></button>
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {b.items.map((i) => (
          <div key={i.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
            <select value={i.groupName ?? ''} onChange={(e) => onItem(i.key, { groupName: e.target.value || null })}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm sm:w-36">
              <option value="">Alla</option>
              {GROUP_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}{groups.includes(g) ? ` (${groupCount(g)})` : ''}</option>
              ))}
            </select>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {i.drill ? (
                <div className="flex items-center gap-2 rounded-md border border-border p-1.5">
                  {isDiagram(i.drill.diagram) && (
                    <DrillDiagram diagram={i.drill.diagram} className="h-12 w-[72px] shrink-0 rounded" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.drill.name}</p>
                    <p className="text-xs text-muted-foreground">{i.drill.durationMinutes ? `${i.drill.durationMinutes} min` : ''}</p>
                  </div>
                  <button type="button" onClick={() => onPick(i.key)} className="rounded-md px-2 py-1 text-xs text-primary hover:bg-muted">Byt</button>
                  <button type="button" onClick={() => onItem(i.key, { drill: null, drillId: null })} className="rounded-md p-1 hover:bg-muted" aria-label="Ta bort övningen"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => onPick(i.key)}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-primary/60 px-3 text-sm font-medium text-primary hover:bg-primary/5">
                    <BookOpen className="h-4 w-4" /> Välj övning
                  </button>
                  <input value={i.title} onChange={(e) => onItem(i.key, { title: e.target.value })} placeholder="…eller skriv en egen rubrik"
                    maxLength={120} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm" />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {i.drill && (
                  <div className="flex gap-1">
                    {LEVELS.filter((l) => i.drill?.levels?.[l]).map((l) => (
                      <button key={l} type="button" onClick={() => onItem(i.key, { level: i.level === l ? null : l })}
                        className={cn('rounded-full px-2.5 py-1 text-xs font-medium', i.level === l ? 'text-white' : 'bg-muted text-muted-foreground')}
                        style={i.level === l ? { backgroundColor: LEVEL_COLOR[l] } : undefined}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <input value={i.notes} onChange={(e) => onItem(i.key, { notes: e.target.value })} placeholder="Anteckning (valfritt)"
                  maxLength={1000} className="h-8 min-w-[160px] flex-1 rounded-md border border-border bg-background px-2 text-xs" />
              </div>
            </div>
            <button type="button" onClick={() => onRemoveItem(i.key)} className="self-end rounded-md p-1.5 text-muted-foreground hover:bg-muted sm:self-start" aria-label="Ta bort raden">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <button type="button" onClick={onAddItem} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <Plus className="h-3.5 w-3.5" /> {b.items.length === 0 ? 'Lägg till övning' : 'Övning för en till grupp'}
        </button>
        <input value={b.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Anteckning för blocket"
          maxLength={1000} className="ml-auto h-8 min-w-[160px] flex-1 rounded-md border border-transparent bg-transparent px-2 text-xs hover:border-border focus:border-border focus:outline-none sm:max-w-xs" />
      </div>
    </section>
  )
}

/* ───────────── Visning (ute på planen) ───────────── */

function BlockView({ b, start, groupCount }: { b: Block; start: string | null; groupCount: (g: string) => number }) {
  const multi = b.items.length > 1
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-baseline gap-3 border-b border-border bg-muted/40 px-4 py-2">
        {start && <span className="text-xs font-semibold tabular-nums text-muted-foreground">{start}</span>}
        <h2 className="flex-1 font-semibold">{b.name}</h2>
        {b.minutes && <span className="text-xs text-muted-foreground">{b.minutes} min</span>}
      </div>
      {b.notes && <p className="border-b border-border px-4 py-2 text-sm text-muted-foreground">{b.notes}</p>}
      {b.items.length > 0 && (
        <div className={cn('grid', multi && 'md:grid-cols-2', 'divide-y divide-border md:divide-y-0')}>
          {b.items.map((i, idx) => (
            <div key={i.key} className={cn(multi && 'md:border-border', multi && idx % 2 === 0 && 'md:border-r', multi && idx >= 2 && 'md:border-t')}>
              <ItemView i={i} groupCount={groupCount} wide={!multi} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ItemView({ i, groupCount, wide }: { i: Item; groupCount: (g: string) => number; wide?: boolean }) {
  const [open, setOpen] = useState(false)
  const d = i.drill
  const lv = d && i.level ? d.levels?.[i.level] : null
  const diagram: Diagram | null = d ? (isDiagram(lv?.diagram) ? lv.diagram : isDiagram(d.diagram) ? d.diagram : null) : null
  const coaching = (d?.coaching ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
  const n = i.groupName ? groupCount(i.groupName) : 0

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {i.groupName && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{i.groupName}{n ? ` · ${n}` : ''}</span>
        )}
        <span className="font-medium">{d?.name ?? (i.title || 'Övning')}</span>
        {i.level && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[i.level] }}>{i.level}</span>
        )}
      </div>
      {i.notes && <p className="text-sm italic text-muted-foreground">{i.notes}</p>}
      {d && (
        <div className={cn('flex flex-col gap-2', wide && 'md:grid md:grid-cols-[minmax(0,440px)_minmax(0,1fr)] md:items-start md:gap-4')}>
          {diagram && (
            <button type="button" onClick={() => setOpen(!open)} className="overflow-hidden rounded-lg border border-border text-left" aria-expanded={open}>
              <DrillDiagram diagram={diagram} className="block h-auto w-full" title={d.name} />
            </button>
          )}
          <div className="flex flex-col gap-2">
          {lv?.text && <p className="rounded-md border-l-4 bg-muted/40 px-2.5 py-1.5 text-sm" style={{ borderColor: LEVEL_COLOR[i.level ?? ''] }}>{lv.text}</p>}
          {coaching.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-sm">
              {coaching.map((c, idx) => <li key={idx} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{c}</li>)}
            </ul>
          )}
          <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 self-start text-xs font-medium text-primary">
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} /> {open ? 'Mindre' : 'Organisation och material'}
          </button>
          {open && (
            <div className="flex flex-col gap-2 text-sm">
              <DrillFacts minutes={d.durationMinutes} min={null} max={null} intensity={d.intensity} />
              {(d.area || d.equipment) && (
                <p className="text-muted-foreground">{[d.area, d.equipment].filter(Boolean).join(' · ')}</p>
              )}
              {d.description && <p className="whitespace-pre-wrap">{d.description}</p>}
              <Link href={`/ovningar/${d.id}`} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> Öppna övningen
              </Link>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────── Mallar ───────────── */

type TemplateBlocks = { name: string; minutes?: number | null; notes?: string | null; items: { groupName?: string | null; drillId?: number | null; title?: string | null; level?: string | null; notes?: string | null }[] }[]

function TemplatesDialog({ open, onClose, current, onApply }: {
  open: boolean
  onClose: () => void
  current: { name: string; minutes: number | null; notes: string; items: { groupName: string | null; drillId: number | null; title: string; level: string | null; notes: string }[] }[]
  onApply: (blocks: TemplateBlocks) => void
}) {
  const list = useGetPlanTemplates()
  const saveT = useSavePlanTemplate()
  const del = useDeletePlanTemplate()
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      list.trigger().catch(() => {})
      setMsg(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function saveCurrent() {
    if (!name.trim()) return
    try {
      const r = await saveT.trigger({ name, blocks: current })
      setMsg(r.replaced ? 'Mallen uppdaterades.' : 'Mallen sparades.')
      setName('')
      await list.trigger()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Kunde inte spara.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Mallar</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-muted-foreground">Använd en sparad plan som utgångspunkt. Den ersätter planen som du redigerar (inget sparas förrän du trycker Spara).</p>
            {!list.data ? (
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
            ) : list.data.length === 0 ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm">Inga mallar ännu.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {list.data.map((t) => {
                  const mins = (t.blocks as TemplateBlocks).reduce((a, b) => a + (b.minutes ?? 0), 0)
                  return (
                    <li key={t.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.blocks.length} block · {mins} min</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onApply(t.blocks as TemplateBlocks)}>Använd</Button>
                      <button type="button" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Ta bort mallen"
                        onClick={async () => { if (window.confirm(`Ta bort mallen ”${t.name}”?`)) { await del.trigger({ id: t.id }).catch(() => {}); list.trigger().catch(() => {}) } }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <p className="text-sm font-medium">Spara planen som mall</p>
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Tisdag 9 mot 9" maxLength={80}
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm" />
              <Button onClick={saveCurrent} disabled={!name.trim() || current.length === 0 || saveT.loading}>Spara</Button>
            </div>
            {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
