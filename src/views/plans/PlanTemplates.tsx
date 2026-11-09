'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CalendarPlus, Check, Clock, Copy, LayoutTemplate, Link2, Loader2, Pencil, Plus, Trash2, Unlink } from 'lucide-react'
import Link, { useRouter } from '../../lib/nav'
import { cn } from '../../lib/shadcn/utils'
import LeadersOnly from '../../components/LeadersOnly'
import SquadLogo from '../../components/SquadLogo'
import { Button } from '../../lib/shadcn/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { canEdit } from '../../lib/squad-store'
import { useGetDrills } from '../../hooks/backend/drills'
import {
  useCopyPlanTemplate, useDeletePlanTemplate, useGetPlanTemplates, useGetPlanTemplateTrainings, useLinkPlanTemplate, useUnlinkPlanTemplate, useUpdatePlanTemplate,
} from '../../hooks/backend/plans'
import { BLOCK_NAMES } from '../../utils/drills'
import DrillPicker from './DrillPicker'
import TemplateSummary, { TemplateInfoButton, type SummaryTemplate } from './TemplateSummary'
import DrillPreview from '../drills/DrillPreview'
import type { DrillListItem } from '../drills/DrillBank'
import {
  BlockEditor, BlockView, blockMinutes, blocksFromTemplate, blocksPayload, GROUP_OPTIONS, k, toInfo,
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
  const copy = useCopyPlanTemplate()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<SummaryTemplate | null>(null)

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

  async function duplicate(id: number) {
    setError(null)
    try {
      const r = await copy.trigger({ id })
      router.push(`/ovningar/mallar/${r.id}/redigera`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte kopiera mallen.')
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
                      {t.linked > 0 && <> · <Link2 className="h-3 w-3 shrink-0" /> {t.linked} {t.linked === 1 ? 'träning' : 'träningar'}</>}
                    </p>
                    {blocks.length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">{blocks.map((b) => b.name).join(' · ')}</p>
                    )}
                  </Link>
                  <TemplateInfoButton name={t.name} onClick={() => setInfo(t)} />
                  <button type="button" onClick={() => duplicate(t.id)} disabled={copy.loading} aria-label={`Kopiera ${t.name}`} title="Kopiera"
                    className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                    <Copy className="h-4 w-4" />
                  </button>
                  <Link href={`/ovningar/mallar/${t.id}/redigera`} aria-label={`Redigera ${t.name}`} title="Redigera"
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
      <TemplateSummary template={info} onClose={() => setInfo(null)}
        action={info && 'id' in info ? (
          <Button size="sm" variant="outline" onClick={() => router.push(`/ovningar/mallar/${(info as { id: number }).id}`)}>Öppna mallen</Button>
        ) : null} />
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
  const [upcomingLinked, setUpcomingLinked] = useState(0)
  const [ask, setAsk] = useState(false)

  useEffect(() => {
    Promise.all([
      drills.data ? Promise.resolve(drills.data) : drills.trigger(),
      id != null ? list.trigger(undefined, { skipCache: true }) : Promise.resolve(null),
    ]).then(([d, templates]) => {
      if (id == null) return
      const t = templates?.find((x) => x.id === id)
      if (!t) { setMissing(true); return }
      setName(t.name)
      setUpcomingLinked(t.upcomingLinked)
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
  const newItem = (group: string | null): Item => ({ key: k(), groupName: group, drillId: null, title: '', level: null, notes: '', drill: null, leaderIds: [], otherAdult: null })
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

  // Öppnad från en träningsplan: tillbaka dit efteråt
  const from = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('fran') : null
  const returnTo = from && /^\/trainings\/\d+\/plan$/.test(from) ? from : null
  const back = returnTo ?? (id == null ? '/ovningar/mallar' : `/ovningar/mallar/${id}`)

  function save() {
    setError(null)
    if (!name.trim()) { setError('Ge mallen ett namn.'); return }
    // Kommande kopplade träningar: fråga om de ska få den nya planen
    if (upcomingLinked > 0) setAsk(true)
    else doSave(false)
  }

  async function doSave(updateLinked: boolean) {
    setAsk(false)
    try {
      const r = await update.trigger({ id, name, blocks: blocksPayload(blocks), updateLinked })
      setDirty(false)
      router.push(returnTo ?? `/ovningar/mallar/${r.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara mallen.')
    }
  }

  function cancel() {
    if (dirty && !window.confirm('Släppa ändringarna?')) return
    router.push(back)
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
          <ArrowLeft className="h-4 w-4" /> {id == null ? 'Mallar' : 'Tillbaka'}
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
      <Dialog open={ask} onOpenChange={(o) => !o && setAsk(false)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[420px]">
          <DialogHeader><DialogTitle>Uppdatera kopplade träningar?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {upcomingLinked === 1 ? '1 kommande träning' : `${upcomingLinked} kommande träningar`} har en plan från den här mallen.
            Ska de få den ändrade planen? Ändringar som gjorts direkt på träningarna skrivs då över. Tidigare träningar ändras inte.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => doSave(false)} disabled={update.loading}>Spara bara mallen</Button>
            <Button onClick={() => doSave(true)} disabled={update.loading}>
              {update.loading ? <Loader2 className="animate-spin" /> : <Check />} Spara och uppdatera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ───────────── Läsvy ───────────── */

const DAY = new Intl.DateTimeFormat('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' })
const TIME = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })
const when = (iso: string) => {
  const d = DAY.format(new Date(iso))
  return `${d.charAt(0).toUpperCase()}${d.slice(1)} ${TIME.format(new Date(iso))}`
}

/** En mall i läsläge, med knappar för att koppla till träningar, se kopplade och redigera. */
export function PlanTemplateView() {
  if (!canEdit()) return <LeadersOnly what="Träningsplansmallarna" />
  return <PlanTemplateViewPage />
}

function PlanTemplateViewPage() {
  const params = useParams<{ mallId?: string }>()
  const id = Number(params.mallId)
  const router = useRouter()
  const list = useGetPlanTemplates()
  const drills = useGetDrills()
  const trainings = useGetPlanTemplateTrainings()
  const [blocks, setBlocks] = useState<Block[] | null>(null)
  const [name, setName] = useState('')
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkedOpen, setLinkedOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const copy = useCopyPlanTemplate()
  async function duplicate() {
    setError(null)
    try {
      const r = await copy.trigger({ id })
      router.push(`/ovningar/mallar/${r.id}/redigera`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte kopiera mallen.')
    }
  }

  const loadTrainings = () => trainings.trigger({ id }, { skipCache: true }).catch((e: Error) => setError(e.message))

  useEffect(() => {
    Promise.all([drills.data ? Promise.resolve(drills.data) : drills.trigger(), list.trigger(undefined, { skipCache: true })])
      .then(([d, templates]) => {
        const t = templates.find((x) => x.id === id)
        if (!t) { setMissing(true); return }
        setName(t.name)
        setBlocks(blocksFromTemplate(t.blocks as TemplateBlocks, d))
      })
      .catch((e: Error) => setError(e.message))
    loadTrainings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (missing) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Mallen finns inte längre.</p>
        <Link href="/ovningar/mallar" className="text-sm font-medium text-primary">Till mallarna</Link>
      </div>
    )
  }

  const total = (blocks ?? []).reduce((a, b) => a + blockMinutes(b), 0)
  const linked = trainings.data?.linked ?? []
  const btn = 'flex flex-col items-center gap-1 rounded-xl bg-primary-foreground/15 px-2 py-2 text-xs font-medium hover:bg-primary-foreground/25'

  return (
    <div className="flex flex-col pb-8">
      <div className="px-4 pb-4 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <Link href="/ovningar/mallar" className="mb-3 flex w-fit items-center gap-1.5 text-sm text-team-accent/80">
          <ArrowLeft className="h-4 w-4" /> Mallar
        </Link>
        <p className="text-sm font-medium uppercase tracking-widest text-team-accent/70">Träningsplansmall</p>
        <h1 className="text-2xl font-bold">{name || ' '}</h1>
        <p className="mt-1 flex items-center gap-3 text-sm text-team-accent/80">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {total} min</span>
          <span>{blocks?.length ?? 0} block</span>
        </p>
        <div className="mt-4 grid max-w-lg grid-cols-4 gap-2">
          <button type="button" onClick={() => setLinkOpen(true)} className={btn}>
            <CalendarPlus className="h-5 w-5" /> Koppla till träning
          </button>
          <button type="button" onClick={() => setLinkedOpen(true)} className={btn}>
            <Link2 className="h-5 w-5" /> Kopplade{trainings.data ? ` (${linked.length})` : ''}
          </button>
          <button type="button" onClick={() => router.push(`/ovningar/mallar/${id}/redigera`)} className={btn}>
            <Pencil className="h-5 w-5" /> Redigera
          </button>
          <button type="button" onClick={duplicate} disabled={copy.loading} className={cn(btn, 'disabled:opacity-60')}>
            {copy.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />} Kopiera
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-3 md:p-4">
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {notice && <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400"><Check className="h-4 w-4" /> {notice}</p>}
        {!blocks ? (
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        ) : blocks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Mallen har inga block än. Tryck på Redigera för att bygga den.</p>
        ) : (
          blocks.map((b) => <BlockView key={b.key} b={b} start={null} groupCount={() => 0} onInfo={(drillId) => setPreview(drillId)} />)
        )}
      </div>

      <DrillPreview drillId={preview} onClose={() => setPreview(null)} />
      <LinkDialog
        open={linkOpen}
        templateId={id}
        templateName={name}
        upcoming={trainings.data?.upcoming ?? null}
        past={trainings.data?.past ?? null}
        onClose={() => setLinkOpen(false)}
        onLinked={(n) => { setLinkOpen(false); setNotice(`Planen är lagd på ${n === 1 ? '1 träning' : `${n} träningar`}.`); loadTrainings() }}
      />
      <LinkedDialog open={linkedOpen} linked={trainings.data ? linked : null} onClose={() => setLinkedOpen(false)} onChanged={loadTrainings} />
    </div>
  )
}

type TT = { id: number; date: string; type: string | null; blocks: number; templateId: number | null; templateName: string | null; upcoming: boolean }

/** Välj kommande träningar som ska få mallens plan. Träningar som redan har en plan måste kryssas i aktivt. */
function LinkDialog({ open, templateId, templateName, upcoming, past, onClose, onLinked }: {
  open: boolean
  templateId: number
  templateName: string
  upcoming: TT[] | null
  past: TT[] | null
  onClose: () => void
  onLinked: (n: number) => void
}) {
  const link = useLinkPlanTemplate()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => { if (open) { setSelected(new Set()); setError(null); setShowPast(false) } }, [open])

  const list = showPast ? past : upcoming
  const all = [...(upcoming ?? []), ...(past ?? [])]
  const replacing = all.filter((t) => selected.has(t.id) && t.blocks > 0 && t.templateId !== templateId).length

  async function save() {
    setError(null)
    try {
      const r = await link.trigger({ id: templateId, trainingIds: Array.from(selected) })
      onLinked(r.linked)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte koppla.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[480px] overflow-y-auto px-4">
        <DialogHeader><DialogTitle>Koppla {templateName} till träning</DialogTitle></DialogHeader>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([[false, 'Kommande'], [true, 'Tidigare']] as const).map(([p, label]) => {
            const n = (p ? past : upcoming ?? []) ?? []
            const chosen = n.filter((t) => selected.has(t.id)).length
            return (
              <button key={label} type="button" onClick={() => setShowPast(p)}
                className={cn('flex-1 rounded-md px-2 py-1 text-sm font-medium', showPast === p ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                {label}{chosen ? ` (${chosen})` : ''}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          {showPast ? 'Träningar de senaste 90 dagarna, senaste först.' : 'Träningar de närmaste 60 dagarna.'} Mallens block läggs som plan på de valda.
        </p>
        {!list ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{showPast ? 'Inga tidigare träningar.' : 'Inga kommande träningar.'}</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {list.map((t) => {
              const mine = t.templateId === templateId
              const on = selected.has(t.id)
              return (
                <li key={t.id}>
                  <label className={cn('flex items-center gap-2.5 px-3 py-2', mine ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50')}>
                    <input type="checkbox" checked={mine || on} disabled={mine}
                      onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n })} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{when(t.date)}</span>
                      <span className="block text-xs text-muted-foreground">{t.type ?? 'Träning'}</span>
                    </span>
                    {mine ? (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Kopplad</span>
                    ) : t.blocks > 0 ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Har plan{t.templateName ? `: ${t.templateName}` : ''}
                      </span>
                    ) : null}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {replacing > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {replacing === 1 ? '1 vald träning har' : `${replacing} valda träningar har`} redan en plan. Den ersätts av mallen.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={save} disabled={selected.size === 0 || link.loading}>
            {link.loading ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Koppla {selected.size || ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Träningar vars plan kommer från mallen. Kopplingen kan tas bort; planen ligger då kvar. */
function LinkedDialog({ open, linked, onClose, onChanged }: { open: boolean; linked: TT[] | null; onClose: () => void; onChanged: () => void }) {
  const unlink = useUnlinkPlanTemplate()
  const [error, setError] = useState<string | null>(null)
  const coming = (linked ?? []).filter((t) => t.upcoming).reverse()
  const past = (linked ?? []).filter((t) => !t.upcoming)

  async function remove(trainingId: number) {
    setError(null)
    try {
      await unlink.trigger({ trainingId })
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ta bort kopplingen.')
    }
  }

  const row = (t: TT) => (
    <li key={t.id} className="flex items-center gap-2 px-3 py-2">
      <Link href={`/trainings/${t.id}/plan`} className="min-w-0 flex-1">
        <span className="block font-medium">{when(t.date)}</span>
        <span className="block text-xs text-muted-foreground">{t.type ?? 'Träning'}</span>
      </Link>
      <button type="button" onClick={() => remove(t.id)} disabled={unlink.loading} title="Ta bort kopplingen (planen ligger kvar)"
        aria-label="Ta bort kopplingen"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
        <Unlink className="h-4 w-4" />
      </button>
    </li>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[440px] overflow-y-auto px-4">
        <DialogHeader><DialogTitle>Kopplade träningar ({linked?.length ?? 0})</DialogTitle></DialogHeader>
        {!linked ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen träning har en plan från den här mallen än.</p>
        ) : (
          <>
            {coming.length > 0 && (
              <section className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kommande</h3>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">{coming.map(row)}</ul>
              </section>
            )}
            {past.length > 0 && (
              <section className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tidigare</h3>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">{past.map(row)}</ul>
              </section>
            )}
            <p className="text-xs text-muted-foreground">Tryck på en träning för att öppna dess plan. Länkikonen tar bort kopplingen men planen ligger kvar.</p>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
