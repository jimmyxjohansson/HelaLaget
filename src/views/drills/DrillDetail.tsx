'use client'

import LeadersOnly from '../../components/LeadersOnly'
import { useRouter } from '../../lib/nav'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Copy, ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useDeleteDrill, useGetDrill, useSaveDrill } from '../../hooks/backend/drills'
import DrillDiagram, { KeeperIcon, LeaderIcon } from '../../components/drills/DrillDiagram'
import { canEdit } from '../../lib/squad-store'
import { cn } from '../../lib/shadcn/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../lib/shadcn/dropdown-menu'
import { ARROW_NAME, LEVELS, TEAM_HEX, isDiagram, type ArrowStyle, type Diagram, type Team } from '../../utils/diagram'
import { LEVEL_COLOR } from '../../utils/drills'
import { CategoryChip, DrillFacts, FormatChip } from './shared'

export type DrillData = NonNullable<ReturnType<typeof useGetDrill>['data']>

/** Övningens innehåll. Används på övningssidan och i träningsplanen. */
export function DrillContent({ drill, level, onLevel, compact }: { drill: DrillData | Omit<DrillData, 'usedCount'>; level: string | null; onLevel?: (l: string | null) => void; compact?: boolean }) {
  const levels = LEVELS.filter((l) => drill.levels?.[l]?.text || drill.levels?.[l]?.diagram)
  const lv = level ? drill.levels?.[level as (typeof LEVELS)[number]] : null
  const diagram: Diagram | null = isDiagram(lv?.diagram) ? lv.diagram : isDiagram(drill.diagram) ? drill.diagram : null
  const coaching = (drill.coaching ?? '').split('\n').map((s) => s.trim()).filter(Boolean)

  return (
    <div className={cn('grid gap-4', !compact && 'md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start')}>
      <div className="flex flex-col gap-3">
        {levels.length > 0 && onLevel && (
          <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Nivå">
            <LevelTab on={!level} onClick={() => onLevel(null)}>Grund</LevelTab>
            {levels.map((l) => (
              <LevelTab key={l} on={level === l} onClick={() => onLevel(l)} color={LEVEL_COLOR[l]}>{l}</LevelTab>
            ))}
          </div>
        )}
        {diagram && (
          <div className="overflow-hidden rounded-xl border border-border">
            <DrillDiagram diagram={diagram} className="block h-auto w-full" title={drill.name} />
          </div>
        )}
        {lv?.text && (
          <div className="rounded-xl border-l-4 bg-card p-3 text-sm" style={{ borderColor: LEVEL_COLOR[level ?? ''] }}>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide" style={{ color: LEVEL_COLOR[level ?? ''] }}>{level}</p>
            <p className="whitespace-pre-wrap">{lv.text}</p>
          </div>
        )}
        {!compact && diagram && <Legend diagram={diagram} />}
      </div>

      <div className="flex flex-col gap-4">
        {drill.summary && <p className="text-[15px] leading-relaxed text-foreground">{drill.summary}</p>}
        <DrillFacts minutes={drill.durationMinutes} min={drill.playersMin} max={drill.playersMax} intensity={drill.intensity} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {drill.area && (<><dt className="text-muted-foreground">Yta</dt><dd>{drill.area}</dd></>)}
          {drill.equipment && (<><dt className="text-muted-foreground">Material</dt><dd>{drill.equipment}</dd></>)}
        </dl>
        {drill.description && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organisation</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{drill.description}</p>
          </section>
        )}
        {coaching.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coachningspunkter</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {coaching.map((c, i) => (
                <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{c}</li>
              ))}
            </ul>
          </section>
        )}
        {!compact && levels.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progression</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {levels.map((l) => (
                <li key={l} className="flex gap-2">
                  <span className="mt-0.5 w-12 shrink-0 text-xs font-semibold" style={{ color: LEVEL_COLOR[l] }}>{l}</span>
                  <span className="whitespace-pre-wrap">{drill.levels[l]?.text || 'Se ritningen.'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="flex flex-wrap gap-1">
          {drill.gameFormats.map((g) => <FormatChip key={g} value={g} />)}
          {drill.categories.map((c) => <CategoryChip key={c} name={c} />)}
        </div>
        {drill.videoUrl && (
          <a href={drill.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
            <ExternalLink className="h-4 w-4" /> Se video
          </a>
        )}
      </div>
    </div>
  )
}

function LevelTab({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick}
      className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium', on ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  )
}

/** Förklaring av symbolerna som finns i ritningen. */
function Legend({ diagram }: { diagram: Diagram }) {
  const item = (key: string, svg: React.ReactNode, label: string) => (
    <span key={key} className="flex items-center gap-1.5">{svg}<span>{label}</span></span>
  )
  const head = (c: string) => <path d="M13,1 L18,4 L13,7" fill={c} />
  const arrows: Record<ArrowStyle, React.ReactNode> = {
    pass: <svg width="20" height="8"><path d="M1,4 L15,4" stroke="currentColor" strokeWidth="1.6" />{head('currentColor')}</svg>,
    run: <svg width="20" height="8"><path d="M1,4 L15,4" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2" />{head('currentColor')}</svg>,
    dribble: <svg width="20" height="8"><path d="M1,4 Q3,1 5,4 T9,4 T13,4 L15,4" stroke="currentColor" strokeWidth="1.4" fill="none" />{head('currentColor')}</svg>,
    shot: <svg width="20" height="8"><path d="M1,4 L15,4" stroke="#ca8a04" strokeWidth="2.4" />{head('#ca8a04')}</svg>,
    line: <svg width="20" height="8"><path d="M1,4 L19,4" stroke="currentColor" strokeWidth="1.6" /></svg>,
  }
  const shapes = diagram.shapes ?? []
  const styles = new Set(shapes.flatMap((s) => (s.kind === 'arrow' ? [s.style] : [])))
  // Gamla gula prickar (N) visas som Gul
  const teams = new Set<Team>(shapes.flatMap((s): Team[] => (s.kind === 'player' ? [s.team === 'N' ? 'Y' : s.team] : [])))
  const dot = (c: string) => <svg width="10" height="10"><circle cx="5" cy="5" r="4.5" fill={c} /></svg>
  const icon = (team: 'GK' | 'L') => (
    <svg width="12" height="12" viewBox="-6 -6 12 12">
      {team === 'GK' ? <KeeperIcon x={0} y={0} r={5.5} u={2} /> : <LeaderIcon x={0} y={0} r={5.5} u={2} />}
    </svg>
  )

  const items = [
    ...(['pass', 'run', 'dribble', 'shot', 'line'] as ArrowStyle[]).filter((a) => styles.has(a)).map((a) => item(a, arrows[a], ARROW_NAME[a])),
    ...(['A', 'B', 'Y', 'O', 'P'] as Team[]).filter((t) => teams.has(t)).map((t) => item(t, dot(TEAM_HEX[t].fill), `Lag ${TEAM_HEX[t].name.toLowerCase()}`)),
    ...(['GK', 'L'] as const).filter((t) => teams.has(t)).map((t) => item(t, icon(t), TEAM_HEX[t].name)),
  ]
  if (items.length === 0) return null
  return <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">{items}</div>
}

export default function DrillDetail() {
  // Spelare och Anhörig når inte den här sidan
  if (!canEdit()) return <LeadersOnly what="Övningsbanken" />
  return <DrillDetailPage />
}

function DrillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const q = useGetDrill()
  const del = useDeleteDrill()
  const save = useSaveDrill()
  const [level, setLevel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const editor = canEdit()

  useEffect(() => {
    q.trigger({ id: Number(id) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const d = q.data

  async function remove() {
    if (!d) return
    const used = d.usedCount ? ` Den används i ${d.usedCount} träningsplan${d.usedCount === 1 ? '' : 'er'}, där namnet står kvar.` : ''
    if (!window.confirm(`Ta bort ”${d.name}” från övningsbanken?${used}`)) return
    try {
      await del.trigger({ id: d.id })
      router.push('/ovningar')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ta bort.')
    }
  }

  async function duplicate() {
    if (!d) return
    try {
      const { id: newId } = await save.trigger({ ...d, id: null, name: `${d.name} (kopia)` })
      router.push(`/ovningar/${newId}/redigera`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte kopiera.')
    }
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-4 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-team-accent/80">
            <ArrowLeft className="h-4 w-4" /> Tillbaka
          </button>
          {editor && d && (
            <div className="flex items-center gap-2">
              <button onClick={() => router.push(`/ovningar/${d.id}/redigera`)}
                className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-sm hover:bg-primary-foreground/30">
                <Pencil className="h-4 w-4" /> Redigera
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30" aria-label="Fler alternativ">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={duplicate} className="flex items-center gap-2"><Copy className="h-4 w-4" /> Kopiera</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTimeout(remove, 0)} className="flex items-center gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Ta bort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        {d ? <h1 className="text-2xl font-bold">{d.name}</h1> : <div className="h-8 w-2/3 animate-pulse rounded bg-primary-foreground/10" />}
      </div>
      <div className="p-4">
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {d ? <DrillContent drill={d} level={level} onLevel={setLevel} /> : q.error ? <p className="text-sm text-muted-foreground">Övningen finns inte.</p> : <div className="h-72 animate-pulse rounded-xl bg-muted" />}
        {d && editor && <DrillOrigin d={d} />}
      </div>
    </div>
  )
}

const DATE = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' })
const ago = (iso: string) => DATE.format(new Date(iso))

/** Vem som skapade och senast ändrade övningen, och när. */
export function DrillOrigin({ d }: { d: Pick<DrillData, 'starterKey' | 'createdAt' | 'createdByName' | 'updatedAt' | 'updatedByName' | 'edited'> }) {
  const by = (n: string | null) => (n ? ` av ${n}` : '')
  return (
    <div className="mt-6 flex flex-col gap-0.5 border-t border-border pt-3 text-xs text-muted-foreground">
      <p>{d.starterKey ? 'Från startpaketet, hämtad' : 'Skapad'} {ago(d.createdAt)}{by(d.createdByName)}</p>
      {d.edited && <p>Senast ändrad {ago(d.updatedAt)}{by(d.updatedByName)}</p>}
    </div>
  )
}
