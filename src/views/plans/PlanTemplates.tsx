'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, Clock, LayoutTemplate, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import Link, { useRouter } from '../../lib/nav'
import LeadersOnly from '../../components/LeadersOnly'
import SquadLogo from '../../components/SquadLogo'
import { Button } from '../../lib/shadcn/button'
import { canEdit } from '../../lib/squad-store'
import { useGetDrills } from '../../hooks/backend/drills'
import { useDeletePlanTemplate, useGetPlanTemplates, useUpdatePlanTemplate } from '../../hooks/backend/plans'
import { BLOCK_NAMES } from '../../utils/drills'
import DrillPicker from './DrillPicker'
import DrillPreview from '../drills/DrillPreview'
import type { DrillListItem } from '../drills/DrillBank'
import {
  BlockEditor, blockMinutes, blocksFromTemplate, blocksPayload, GROUP_OPTIONS, k, toInfo,
  type Block, type Item, type TemplateBlocks,
} from './TrainingPlan'

const minutesOf = (blocks: TemplateBlocks) => blocks.reduce((a, b) => a + (b.minutes ?? 0), 0)

/* ───────────── Listan ───────────── */

/** Lagets sparade träningsplansmallar: skapa, redigera och ta bort. */
export default function PlanTemplates() {
  if (!canEdit()) return <LeadersOnly what="Träningsplansmallarna" />
  return <PlanTemplatesPage />
}

function PlanTemplatesPage() {
  const router = useRouter()
  const list = useGetPlanTemplates()
  const del = useDeletePlanTemplate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    list.trigger(undefined, { skipCache: true }).catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function remove(id: number, name: string) {
    if (!window.confirm(`Ta bort mallen ”${name}”? Träningsplaner som redan gjorts från den påverkas inte.`)) return
    setError(null)
    try {
      await del.trigger({ id })
      await list.trigger(undefined, { skipCache: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ta bort mallen.')
    }
  }

  const templates = list.data ?? []

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-3 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SquadLogo />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Träningsplansmallar</h1>
              <p className="text-sm text-team-accent/70">Lagets sparade träningsplaner{templates.length ? ` · ${templates.length} st` : ''}</p>
            </div>
          </div>
          <button type="button" onClick={() => router.push('/ovningar/mallar/ny')}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-2 text-sm font-medium hover:bg-primary-foreground/30">
            <Plus className="h-4 w-4" /> Ny mall
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3 md:p-4">
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!list.data ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Inga mallar ännu. Skapa en här, eller spara en träningsplan som mall under Mallar på ett träningspass.
            </p>
            <Button onClick={() => router.push('/ovningar/mallar/ny')}><Plus /> Ny mall</Button>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {templates.map((t) => {
              const blocks = t.blocks as TemplateBlocks
              return (
                <li key={t.id} className="flex items-center gap-2 px-3 py-2.5">
                  <Link href={`/ovningar/mallar/${t.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" /> {minutesOf(blocks)} min · {blocks.length} block
                    </p>
                    {blocks.length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">{blocks.map((b) => b.name).join(' · ')}</p>
                    )}
                  </Link>
                  <Link href={`/ovningar/mallar/${t.id}`} aria-label={`Redigera ${t.name}`} title="Redigera"
                    className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button type="button" onClick={() => remove(t.id, t.name)} disabled={del.loading} aria-label={`Ta bort ${t.name}`} title="Ta bort"
                    className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ───────────── Redigering ───────────── */

/** Skapa eller redigera en mall: namn och block, med samma redigerare som träningsplanen. */
export function PlanTemplateEdit() {
  if (!canEdit()) return <LeadersOnly what="Träningsplansmallarna" />
  return <PlanTemplateEditPage />
}

function PlanTemplateEditPage() {
  const params = useParams<{ mallId?: string }>()
  const id = params.mallId ? Number(params.mallId) : null
  const router = useRouter()
  const list = useGetPlanTemplates()
  const drills = useGetDrills()
  const update = useUpdatePlanTemplate()
  const [name, setName] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loaded, setLoaded] = useState(id == null)
  const [missing, setMissing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ block: string; item: string } | null>(null)
  const [preview, setPreview] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      drills.data ? Promise.resolve(drills.data) : drills.trigger(),
      id != null ? list.trigger(undefined, { skipCache: true }) : Promise.resolve(null),
    ]).then(([d, templates]) => {
      if (id == null) return
      const t = templates?.find((x) => x.id === id)
      if (!t) { setMissing(true); return }
      setName(t.name)
      setBlocks(blocksFromTemplate(t.blocks as TemplateBlocks, d))
      setLoaded(true)
    }).catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const total = blocks.reduce((a, b) => a + blockMinutes(b), 0)

  function change(fn: (b: Block[]) => Block[]) {
    setBlocks((prev) => fn(prev))
    setDirty(true)
  }
  const updateBlock = (key: string, patch: Partial<Block>) => change((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)))
  const updateItem = (bk: string, ik: string, patch: Partial<Item>) =>
    change((bs) => bs.map((b) => (b.key === bk ? { ...b, items: b.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) } : b)))
  const newItem = (group: string | null): Item => ({ key: k(), groupName: group, drillId: null, title: '', level: null, notes: '', drill: null })
  function addBlock(n: string) {
    change((bs) => [...bs, { key: k(), name: n, minutes: n === 'Vattenpaus' ? '3' : '', notes: '', items: n === 'Vattenpaus' ? [] : [newItem(null)] }])
  }
  function addItem(b: Block) {
    if (b.items.length === 0) return updateBlock(b.key, { items: [newItem(null)] })
    const items = b.items.length === 1 && b.items[0].groupName == null ? [{ ...b.items[0], groupName: GROUP_OPTIONS[0] }] : b.items
    const taken = new Set(items.map((i) => i.groupName))
    updateBlock(b.key, { items: [...items, newItem(GROUP_OPTIONS.find((g) => !taken.has(g)) ?? null)] })
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

  async function save() {
    setError(null)
    if (!name.trim()) { setError('Ge mallen ett namn.'); return }
    try {
      await update.trigger({ id, name, blocks: blocksPayload(blocks) })
      setDirty(false)
      router.push('/ovningar/mallar')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara mallen.')
    }
  }

  function cancel() {
    if (dirty && !window.confirm('Släppa ändringarna?')) return
    router.push('/ovningar/mallar')
  }

  if (missing) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Mallen finns inte längre.</p>
        <Link href="/ovningar/mallar" className="text-sm font-medium text-primary">Till mallarna</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-24">
      <div className="px-4 pb-4 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <button onClick={cancel} className="mb-3 flex items-center gap-1.5 text-sm text-team-accent/80">
          <ArrowLeft className="h-4 w-4" /> Mallar
        </button>
        <p className="text-sm font-medium uppercase tracking-widest text-team-accent/70">{id == null ? 'Ny mall' : 'Redigera mall'}</p>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setDirty(true) }}
          placeholder="Mallens namn, t.ex. Tisdag 9 mot 9"
          maxLength={80}
          aria-label="Mallens namn"
          className="mt-1 w-full rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-2 py-1.5 text-xl font-bold text-team-accent placeholder:text-team-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-foreground/40"
        />
        <p className="mt-1.5 flex items-center gap-3 text-sm text-team-accent/80">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {total} min</span>
          <span>{blocks.length} block</span>
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-3 md:p-4">
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!loaded ? (
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        ) : (
          <>
            {blocks.map((b, bi) => (
              <BlockEditor
                key={b.key}
                b={b}
                start={null}
                first={bi === 0}
                last={bi === blocks.length - 1}
                groups={[]}
                groupCount={() => 0}
                onChange={(patch) => updateBlock(b.key, patch)}
                onItem={(ik, patch) => updateItem(b.key, ik, patch)}
                onRemoveItem={(ik) => updateBlock(b.key, { items: b.items.filter((i) => i.key !== ik) })}
                onAddItem={() => addItem(b)}
                onPick={(ik) => setPicker({ block: b.key, item: ik })}
                onInfo={(drillId) => setPreview(drillId)}
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
                Bygg mallen block för block. Övningarna hämtas från <Link href="/ovningar" className="text-primary underline-offset-4 hover:underline">övningsbanken</Link>.
              </p>
            )}
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(56px_+_env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-2 backdrop-blur md:sticky md:bottom-0">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <span className="text-sm text-muted-foreground">Totalt <b className="text-foreground">{total} min</b></span>
          <span className="ml-auto" />
          <Button type="button" variant="outline" onClick={cancel}>Avbryt</Button>
          <Button type="button" onClick={save} disabled={update.loading || !loaded}>
            {update.loading ? <Loader2 className="animate-spin" /> : <Check />} Spara
          </Button>
        </div>
      </div>

      <DrillPreview drillId={preview} onClose={() => setPreview(null)} />
      <DrillPicker open={!!picker} drills={drills.data} onClose={() => setPicker(null)} onPick={pick} />
    </div>
  )
}
