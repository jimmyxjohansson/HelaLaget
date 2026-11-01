'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { useGetDrill, useSaveDrill } from '../../hooks/backend/drills'
import DiagramEditor from '../../components/drills/DiagramEditor'
import { PageHeader } from '../account/shared'
import { Input } from '../../lib/shadcn/input'
import { Textarea } from '../../lib/shadcn/textarea'
import { Label } from '../../lib/shadcn/label'
import { Button } from '../../lib/shadcn/button'
import { cn } from '../../lib/shadcn/utils'
import { LEVELS, cloneDiagram, emptyDiagram, isDiagram, type Diagram, type Level } from '../../utils/diagram'
import { CATEGORIES, GAME_FORMATS, INTENSITIES, INTENSITY_COLOR, LEVEL_COLOR } from '../../utils/drills'

type LevelForm = { text: string; diagram: Diagram | null }
type Form = {
  name: string
  summary: string
  description: string
  coaching: string
  gameFormats: string[]
  categories: string[]
  durationMinutes: string
  playersMin: string
  playersMax: string
  area: string
  equipment: string
  intensity: string | null
  videoUrl: string
  diagram: Diagram
  levels: Record<Level, LevelForm>
}

const EMPTY: Form = {
  name: '', summary: '', description: '', coaching: '', gameFormats: [], categories: [], durationMinutes: '15',
  playersMin: '', playersMax: '', area: '', equipment: '', intensity: null, videoUrl: '',
  diagram: emptyDiagram(),
  levels: { Lätt: { text: '', diagram: null }, Medel: { text: '', diagram: null }, Svår: { text: '', diagram: null } },
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Skapa eller redigera en övning. */
export default function DrillEdit() {
  const params = useParams<{ id?: string }>()
  const id = params.id ? Number(params.id) : null
  const router = useRouter()
  const q = useGetDrill()
  const save = useSaveDrill()
  const [form, setForm] = useState<Form>(EMPTY)
  const [loaded, setLoaded] = useState(!id)
  const [newCat, setNewCat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [openLevel, setOpenLevel] = useState<Level | null>(null)

  useEffect(() => {
    if (!id) return
    q.trigger({ id }).then((d) => {
      if (!d) return
      setForm({
        name: d.name, summary: d.summary ?? '', description: d.description ?? '', coaching: d.coaching ?? '',
        gameFormats: d.gameFormats, categories: d.categories,
        durationMinutes: d.durationMinutes ? String(d.durationMinutes) : '',
        playersMin: d.playersMin ? String(d.playersMin) : '', playersMax: d.playersMax ? String(d.playersMax) : '',
        area: d.area ?? '', equipment: d.equipment ?? '', intensity: d.intensity, videoUrl: d.videoUrl ?? '',
        diagram: isDiagram(d.diagram) ? d.diagram : emptyDiagram(),
        levels: Object.fromEntries(LEVELS.map((l) => [l, {
          text: d.levels?.[l]?.text ?? '',
          diagram: isDiagram(d.levels?.[l]?.diagram) ? (d.levels[l]!.diagram as Diagram) : null,
        }])) as Record<Level, LevelForm>,
      })
      setLoaded(true)
    }).catch(() => setError('Kunde inte läsa övningen.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setLevel = (l: Level, patch: Partial<LevelForm>) => setForm((f) => ({ ...f, levels: { ...f.levels, [l]: { ...f.levels[l], ...patch } } }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('Ge övningen ett namn.')
    try {
      const r = await save.trigger({
        id,
        name: form.name,
        summary: form.summary,
        description: form.description,
        coaching: form.coaching,
        gameFormats: form.gameFormats,
        categories: form.categories,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        playersMin: form.playersMin ? Number(form.playersMin) : null,
        playersMax: form.playersMax ? Number(form.playersMax) : null,
        area: form.area,
        equipment: form.equipment,
        intensity: form.intensity,
        videoUrl: form.videoUrl,
        diagram: form.diagram.shapes.length ? form.diagram : null,
        levels: form.levels,
      })
      router.replace(`/ovningar/${r.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara.')
    }
  }

  const customCats = form.categories.filter((c) => !CATEGORIES.some((x) => x.name === c))

  if (!loaded) {
    return (
      <div className="flex flex-col">
        <PageHeader title={id ? 'Redigera övning' : 'Ny övning'} />
        <div className="p-4"><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col pb-24">
      <PageHeader title={id ? 'Redigera övning' : 'Ny övning'} />
      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        {/* Text och fakta */}
        <div className="flex flex-col gap-4">
          <Field label="Namn">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="T.ex. Rondo 4 mot 1" maxLength={120} />
          </Field>
          <Field label="Syfte (kort beskrivning)">
            <Textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} rows={2} placeholder="Vad tränar övningen?" />
          </Field>

          <Field label="Spelformer">
            <div className="flex flex-wrap gap-1.5">
              {GAME_FORMATS.map((g) => (
                <ChipBtn key={g.value} on={form.gameFormats.includes(g.value)} onClick={() => set('gameFormats', toggle(form.gameFormats, g.value))}>{g.label}</ChipBtn>
              ))}
            </div>
          </Field>
          <Field label="Kategorier">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <ChipBtn key={c.name} on={form.categories.includes(c.name)} color={c.color} onClick={() => set('categories', toggle(form.categories, c.name))}>{c.name}</ChipBtn>
              ))}
              {customCats.map((c) => (
                <ChipBtn key={c} on onClick={() => set('categories', toggle(form.categories, c))}>{c} <X className="h-3 w-3" /></ChipBtn>
              ))}
              <span className="flex items-center gap-1">
                <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Egen…" maxLength={40}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCat() } }}
                  className="h-7 w-24 rounded-full border border-border bg-background px-2.5 text-xs" />
                {newCat.trim() && <button type="button" onClick={addCat} className="rounded-full bg-muted p-1"><Plus className="h-3.5 w-3.5" /></button>}
              </span>
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tid (min)"><Input type="number" min={1} max={180} value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} /></Field>
            <Field label="Spelare min"><Input type="number" min={1} max={60} value={form.playersMin} onChange={(e) => set('playersMin', e.target.value)} /></Field>
            <Field label="Spelare max"><Input type="number" min={1} max={60} value={form.playersMax} onChange={(e) => set('playersMax', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yta"><Input value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="30 × 20 m" maxLength={60} /></Field>
            <Field label="Intensitet">
              <div className="flex gap-1.5">
                {INTENSITIES.map((i) => (
                  <ChipBtn key={i} on={form.intensity === i} color={INTENSITY_COLOR[i]} onClick={() => set('intensity', form.intensity === i ? null : i)}>{i}</ChipBtn>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Material"><Input value={form.equipment} onChange={(e) => set('equipment', e.target.value)} placeholder="8 koner, 2 småmål, västar" maxLength={300} /></Field>
          <Field label="Organisation – så går övningen till">
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} />
          </Field>
          <Field label="Coachningspunkter (en per rad)">
            <Textarea value={form.coaching} onChange={(e) => set('coaching', e.target.value)} rows={4} placeholder={'Öppen kroppsställning\nPassa på rätt fot'} />
          </Field>
          <Field label="Videolänk (valfritt)"><Input value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/…" /></Field>
        </div>

        {/* Ritning och progression */}
        <div className="flex flex-col gap-4">
          <Field label="Ritning">
            <DiagramEditor value={form.diagram} onChange={(d) => set('diagram', d)} />
          </Field>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Progression</Label>
            {LEVELS.map((l) => {
              const lv = form.levels[l]
              return (
                <div key={l} className="rounded-xl border border-border bg-card p-3" style={{ borderLeft: `4px solid ${LEVEL_COLOR[l]}` }}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: LEVEL_COLOR[l] }}>{l}</span>
                    {lv.diagram ? (
                      <span className="flex gap-2 text-xs">
                        <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setOpenLevel(openLevel === l ? null : l)}>
                          {openLevel === l ? 'Stäng ritningen' : 'Visa egen ritning'}
                        </button>
                        <button type="button" className="text-destructive underline-offset-4 hover:underline" onClick={() => { setLevel(l, { diagram: null }); setOpenLevel(null) }}>Ta bort ritning</button>
                      </span>
                    ) : (
                      <button type="button" className="text-xs text-primary underline-offset-4 hover:underline"
                        onClick={() => { setLevel(l, { diagram: cloneDiagram(form.diagram) }); setOpenLevel(l) }}>
                        + Egen ritning
                      </button>
                    )}
                  </div>
                  <Textarea value={lv.text} onChange={(e) => setLevel(l, { text: e.target.value })} rows={2}
                    placeholder={l === 'Lätt' ? 'T.ex. större yta, fler tillslag, passiv försvarare' : l === 'Medel' ? 'Grundövningen' : 'T.ex. mindre yta, färre tillslag, tidsgräns'} />
                  {lv.diagram && openLevel === l && (
                    <div className="mt-2">
                      <DiagramEditor value={lv.diagram} onChange={(d) => setLevel(l, { diagram: d })} />
                    </div>
                  )}
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground">Utan egen ritning visas grundritningen för nivån.</p>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(56px_+_env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-2 backdrop-blur md:sticky md:bottom-0">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <span className="ml-auto" />
          <Button type="button" variant="outline" onClick={() => router.back()}>Avbryt</Button>
          <Button type="submit" disabled={save.loading}>
            {save.loading ? <Loader2 className="animate-spin" /> : <Check />} Spara
          </Button>
        </div>
      </div>
    </form>
  )

  function addCat() {
    const c = newCat.trim()
    if (c && !form.categories.includes(c)) set('categories', [...form.categories, c])
    setNewCat('')
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ChipBtn({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
      style={on && color ? { backgroundColor: color, color: '#fff' } : undefined}>
      {children}
    </button>
  )
}
