'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Copy, MousePointer2, RotateCw, Trash2, Undo2, Eraser } from 'lucide-react'
import DrillDiagram from './DrillDiagram'
import { cn } from '../../lib/shadcn/utils'
import {
  ARROW_NAME, CONE_HEX, TEAM_HEX, moveShape, newId, snap, unit,
  type ArrowStyle, type ConeColor, type Diagram, type Pitch, type Pt, type Shape, type Team,
} from '../../utils/diagram'

type Tool =
  | { t: 'select' }
  | { t: 'cone'; color: ConeColor }
  | { t: 'player'; team: Team }
  | { t: 'ball' }
  | { t: 'goal'; size: 'small' | 'large' }
  | { t: 'pole' }
  | { t: 'zone'; color: ConeColor }
  | { t: 'text' }
  | { t: 'arrow'; style: ArrowStyle }

type Drag =
  | { mode: 'move'; id: string; start: Pt; orig: Shape }
  | { mode: 'handle'; id: string; end: 'from' | 'to' }
  | { mode: 'draw'; start: Pt; now: Pt }
  | null

const PITCHES: { value: Pitch; label: string }[] = [
  { value: 'plain', label: 'Fri yta' },
  { value: 'half', label: 'Halvplan' },
  { value: 'full', label: 'Helplan' },
]

const SIZES = [
  { label: '20 × 15', w: 20, h: 15 },
  { label: '30 × 20', w: 30, h: 20 },
  { label: '40 × 30', w: 40, h: 30 },
  { label: '5 mot 5', w: 30, h: 20, pitch: 'full' as Pitch },
  { label: '7 mot 7', w: 55, h: 35, pitch: 'full' as Pitch },
  { label: '9 mot 9', w: 72, h: 50, pitch: 'full' as Pitch },
  { label: '11 mot 11', w: 105, h: 68, pitch: 'full' as Pitch },
]

/**
 * Ritverktyg: välj ett verktyg och klicka på planen för att lägga ut, dra för
 * pilar och zoner. Med Markera flyttar man, ändrar och tar bort.
 */
export default function DiagramEditor({ value, onChange }: { value: Diagram; onChange: (d: Diagram) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>({ t: 'select' })
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag>(null)
  const history = useRef<Diagram[]>([])
  const valueRef = useRef(value)
  valueRef.current = value

  const sel = value.shapes.find((s) => s.id === selected) ?? null
  const u = unit(value)

  function commit(next: Diagram, record = true) {
    if (record) {
      history.current.push(valueRef.current)
      if (history.current.length > 60) history.current.shift()
    }
    onChange(next)
  }
  function update(id: string, patch: Partial<Shape>, record = true) {
    commit({ ...valueRef.current, shapes: valueRef.current.shapes.map((s) => (s.id === id ? ({ ...s, ...patch } as Shape) : s)) }, record)
  }
  function remove(id: string) {
    commit({ ...value, shapes: value.shapes.filter((s) => s.id !== id) })
    setSelected(null)
  }
  function undo() {
    const prev = history.current.pop()
    if (prev) {
      onChange(prev)
      setSelected(null)
    }
  }
  function duplicate(s: Shape) {
    const copy = { ...moveShape(s, u * 2, u * 2), id: newId() } as Shape
    commit({ ...value, shapes: [...value.shapes, copy] })
    setSelected(copy.id)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault()
        remove(selected)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function toPoint(e: { clientX: number; clientY: number }): Pt {
    const svg = svgRef.current!
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const pad = 1.5
    return {
      x: Math.min(value.width + pad, Math.max(-pad, snap(p.x, 0.25))),
      y: Math.min(value.height + pad, Math.max(-pad, snap(p.y, 0.25))),
    }
  }

  function onDown(e: ReactPointerEvent<SVGSVGElement>) {
    const p = toPoint(e)
    const target = e.target as Element
    svgRef.current?.setPointerCapture(e.pointerId)
    const handle = target.closest('[data-handle]')?.getAttribute('data-handle') as 'from' | 'to' | null
    if (handle && selected) {
      history.current.push(value)
      setDrag({ mode: 'handle', id: selected, end: handle })
      return
    }
    const hitId = target.closest('[data-id]')?.getAttribute('data-id') ?? null
    if (tool.t === 'select') {
      setSelected(hitId)
      if (hitId) {
        const orig = value.shapes.find((s) => s.id === hitId)!
        history.current.push(value)
        setDrag({ mode: 'move', id: hitId, start: p, orig })
      }
      return
    }
    if (tool.t === 'arrow' || tool.t === 'zone') {
      setDrag({ mode: 'draw', start: p, now: p })
      return
    }
    let shape: Shape
    const id = newId()
    switch (tool.t) {
      case 'cone': shape = { id, kind: 'cone', x: p.x, y: p.y, color: tool.color }; break
      case 'player': shape = { id, kind: 'player', x: p.x, y: p.y, team: tool.team, label: tool.team === 'GK' ? 'MV' : '' }; break
      case 'ball': shape = { id, kind: 'ball', x: p.x, y: p.y }; break
      case 'goal': shape = { id, kind: 'goal', x: p.x, y: p.y, size: tool.size, rot: p.x < value.width / 2 ? 270 : 90 }; break
      case 'pole': shape = { id, kind: 'pole', x: p.x, y: p.y }; break
      case 'text': {
        const text = window.prompt('Text på ritningen')?.trim()
        if (!text) return
        shape = { id, kind: 'text', x: p.x, y: p.y, text }
        break
      }
    }
    commit({ ...value, shapes: [...value.shapes, shape] })
    setSelected(id)
  }

  function onMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return
    const p = toPoint(e)
    if (drag.mode === 'draw') setDrag({ ...drag, now: p })
    else if (drag.mode === 'move') {
      const moved = moveShape(drag.orig, p.x - drag.start.x, p.y - drag.start.y)
      onChange({ ...valueRef.current, shapes: valueRef.current.shapes.map((s) => (s.id === drag.id ? moved : s)) })
    } else if (drag.mode === 'handle') {
      update(drag.id, { [drag.end]: p } as Partial<Shape>, false)
    }
  }

  function onUp(e: ReactPointerEvent<SVGSVGElement>) {
    svgRef.current?.releasePointerCapture?.(e.pointerId)
    if (drag?.mode === 'draw') {
      const { start, now } = drag
      const dist = Math.hypot(now.x - start.x, now.y - start.y)
      if (dist >= 1) {
        const id = newId()
        const shape: Shape =
          tool.t === 'arrow'
            ? { id, kind: 'arrow', style: tool.style, from: start, to: now }
            : { id, kind: 'zone', x: Math.min(start.x, now.x), y: Math.min(start.y, now.y), w: Math.abs(now.x - start.x), h: Math.abs(now.y - start.y), color: tool.t === 'zone' ? tool.color : 'blue' }
        commit({ ...value, shapes: [...value.shapes, shape] })
        setSelected(id)
      }
    } else if (drag?.mode === 'move') {
      // Inget flyttades: ta bort det onödiga steget i ångra-historiken
      const s = value.shapes.find((x) => x.id === drag.id)
      if (s && JSON.stringify(s) === JSON.stringify(drag.orig)) history.current.pop()
    }
    setDrag(null)
  }

  // Förhandsvisning när man drar ut en pil eller zon, och handtag på markerad pil
  const preview: Shape | null =
    drag?.mode === 'draw'
      ? tool.t === 'arrow'
        ? { id: '_draft', kind: 'arrow', style: tool.style, from: drag.start, to: drag.now }
        : { id: '_draft', kind: 'zone', x: Math.min(drag.start.x, drag.now.x), y: Math.min(drag.start.y, drag.now.y), w: Math.abs(drag.now.x - drag.start.x), h: Math.abs(drag.now.y - drag.start.y), color: tool.t === 'zone' ? tool.color : 'blue' }
      : null
  const shown = preview ? { ...value, shapes: [...value.shapes, preview] } : value
  const handles =
    sel?.kind === 'arrow' && tool.t === 'select' ? (
      <g>
        {(['from', 'to'] as const).map((end) => (
          <circle key={end} data-handle={end} cx={sel[end].x} cy={sel[end].y} r={u * 0.55} fill="#fde047" stroke="#111" strokeWidth={u * 0.08} style={{ cursor: 'grab' }} />
        ))}
      </g>
    ) : null

  const toolBtn = (active: boolean) =>
    cn('flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted')
  const is = (t: Tool) => JSON.stringify(t) === JSON.stringify(tool)

  return (
    <div className="flex flex-col gap-2">
      {/* Planens storlek */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1">
          <span className="text-muted-foreground">Bredd</span>
          <input type="number" min={5} max={120} value={value.width}
            onChange={(e) => commit({ ...value, width: clampSize(e.target.value, value.width) })}
            className="h-8 w-16 rounded-md border border-border bg-background px-2" />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-muted-foreground">Längd</span>
          <input type="number" min={5} max={120} value={value.height}
            onChange={(e) => commit({ ...value, height: clampSize(e.target.value, value.height) })}
            className="h-8 w-16 rounded-md border border-border bg-background px-2" />
        </label>
        <span className="text-muted-foreground">m</span>
        <select value={value.pitch} onChange={(e) => commit({ ...value, pitch: e.target.value as Pitch })}
          className="h-8 rounded-md border border-border bg-background px-2">
          {PITCHES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value="" onChange={(e) => {
          const s = SIZES[Number(e.target.value)]
          if (s) commit({ ...value, width: s.w, height: s.h, pitch: s.pitch ?? value.pitch })
        }} className="h-8 rounded-md border border-border bg-background px-2">
          <option value="">Snabbval…</option>
          {SIZES.map((s, i) => <option key={s.label} value={i}>{s.label}{s.pitch ? ' (plan)' : ' m'}</option>)}
        </select>
      </div>

      {/* Verktyg */}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={toolBtn(is({ t: 'select' }))} onClick={() => setTool({ t: 'select' })} title="Markera och flytta">
          <MousePointer2 className="h-4 w-4" /> <span className="hidden sm:inline">Markera</span>
        </button>
        {(['orange', 'yellow', 'blue', 'red', 'white'] as ConeColor[]).map((c) => (
          <button key={c} type="button" className={toolBtn(is({ t: 'cone', color: c }))} onClick={() => setTool({ t: 'cone', color: c })} title="Kon">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8,2 L14,14 L2,14 z" fill={CONE_HEX[c]} stroke="#0006" /></svg>
          </button>
        ))}
        {(['A', 'B', 'N', 'GK'] as Team[]).map((t) => (
          <button key={t} type="button" className={toolBtn(is({ t: 'player', team: t }))} onClick={() => setTool({ t: 'player', team: t })} title={TEAM_HEX[t].name}>
            <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill={TEAM_HEX[t].fill} stroke="#fff" strokeWidth="1.5" /></svg>
          </button>
        ))}
        <button type="button" className={toolBtn(is({ t: 'ball' }))} onClick={() => setTool({ t: 'ball' })} title="Boll">
          <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#fff" stroke="#111" /><circle cx="8" cy="8" r="2.2" fill="#111" /></svg>
        </button>
        <button type="button" className={toolBtn(is({ t: 'goal', size: 'small' }))} onClick={() => setTool({ t: 'goal', size: 'small' })} title="Litet mål">Mål S</button>
        <button type="button" className={toolBtn(is({ t: 'goal', size: 'large' }))} onClick={() => setTool({ t: 'goal', size: 'large' })} title="Stort mål">Mål L</button>
        <button type="button" className={toolBtn(is({ t: 'pole' }))} onClick={() => setTool({ t: 'pole' })} title="Käpp">
          <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="#fde047" stroke="#111" /></svg>
        </button>
        {(['pass', 'run', 'dribble', 'shot'] as ArrowStyle[]).map((s) => (
          <button key={s} type="button" className={toolBtn(is({ t: 'arrow', style: s }))} onClick={() => setTool({ t: 'arrow', style: s })} title={`${ARROW_NAME[s]}: dra på planen`}>
            <ArrowIcon style={s} /> <span className="hidden sm:inline">{ARROW_NAME[s]}</span>
          </button>
        ))}
        <button type="button" className={toolBtn(is({ t: 'zone', color: 'blue' }))} onClick={() => setTool({ t: 'zone', color: 'blue' })} title="Zon: dra på planen">Zon</button>
        <button type="button" className={toolBtn(is({ t: 'text' }))} onClick={() => setTool({ t: 'text' })} title="Text">Aa</button>
        <span className="mx-1 w-px self-stretch bg-border" />
        <button type="button" className={toolBtn(false)} onClick={undo} disabled={history.current.length === 0} title="Ångra (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn(false)} onClick={() => { if (value.shapes.length && window.confirm('Rensa hela ritningen?')) { commit({ ...value, shapes: [] }); setSelected(null) } }} title="Rensa ritningen">
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <DrillDiagram
          diagram={shown}
          svgRef={svgRef}
          selectedId={selected}
          overlay={handles}
          className={cn('block h-auto w-full', tool.t === 'select' ? 'cursor-default' : 'cursor-crosshair')}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        />
      </div>

      {/* Egenskaper för markerad figur */}
      <div className="flex min-h-9 flex-wrap items-center gap-2 text-xs">
        {!sel ? (
          <span className="text-muted-foreground">
            {tool.t === 'select'
              ? 'Klicka på en figur för att flytta eller ändra den.'
              : tool.t === 'arrow' || tool.t === 'zone'
                ? 'Dra på planen.'
                : 'Klicka på planen för att lägga ut. Byt till Markera för att flytta.'}
          </span>
        ) : (
          <>
            <span className="font-medium">{shapeName(sel)}</span>
            {sel.kind === 'player' && (
              <>
                <input value={sel.label ?? ''} maxLength={3} placeholder="Text"
                  onChange={(e) => update(sel.id, { label: e.target.value }, false)}
                  className="h-8 w-16 rounded-md border border-border bg-background px-2" />
                {(['A', 'B', 'N', 'GK'] as Team[]).map((t) => (
                  <button key={t} type="button" onClick={() => update(sel.id, { team: t })} title={TEAM_HEX[t].name}
                    className={cn('h-6 w-6 rounded-full border-2', sel.team === t ? 'border-foreground' : 'border-transparent')} style={{ backgroundColor: TEAM_HEX[t].fill }} />
                ))}
              </>
            )}
            {(sel.kind === 'cone' || sel.kind === 'zone') && (['orange', 'yellow', 'blue', 'red', 'white'] as ConeColor[]).map((c) => (
              <button key={c} type="button" onClick={() => update(sel.id, { color: c })}
                className={cn('h-6 w-6 rounded-full border-2', sel.color === c ? 'border-foreground' : 'border-border')} style={{ backgroundColor: CONE_HEX[c] }} />
            ))}
            {sel.kind === 'goal' && (
              <>
                <button type="button" className={toolBtn(false)} onClick={() => update(sel.id, { rot: (sel.rot + 90) % 360 })}>
                  <RotateCw className="h-4 w-4" /> Vrid
                </button>
                <button type="button" className={toolBtn(false)} onClick={() => update(sel.id, { size: sel.size === 'small' ? 'large' : 'small' })}>
                  {sel.size === 'small' ? 'Gör stort' : 'Gör litet'}
                </button>
              </>
            )}
            {sel.kind === 'arrow' && (
              <>
                <select value={sel.style} onChange={(e) => update(sel.id, { style: e.target.value as ArrowStyle })} className="h-8 rounded-md border border-border bg-background px-2">
                  {(['pass', 'run', 'dribble', 'shot'] as ArrowStyle[]).map((s) => <option key={s} value={s}>{ARROW_NAME[s]}</option>)}
                </select>
                {sel.style !== 'dribble' && (
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">Böj</span>
                    <input type="range" min={-10} max={10} step={0.5} value={sel.bend ?? 0}
                      onChange={(e) => update(sel.id, { bend: Number(e.target.value) || undefined }, false)} className="w-24" />
                  </label>
                )}
              </>
            )}
            {sel.kind === 'text' && (
              <input value={sel.text} onChange={(e) => update(sel.id, { text: e.target.value }, false)}
                className="h-8 w-40 rounded-md border border-border bg-background px-2" />
            )}
            <span className="ml-auto flex gap-1.5">
              <button type="button" className={toolBtn(false)} onClick={() => duplicate(sel)} title="Kopiera">
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" className={cn(toolBtn(false), 'text-destructive')} onClick={() => remove(sel.id)} title="Ta bort (Delete)">
                <Trash2 className="h-4 w-4" />
              </button>
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function clampSize(v: string, fallback: number) {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 5 && n <= 120 ? n : fallback
}

function shapeName(s: Shape) {
  switch (s.kind) {
    case 'cone': return 'Kon'
    case 'player': return TEAM_HEX[s.team].name
    case 'ball': return 'Boll'
    case 'goal': return s.size === 'large' ? 'Stort mål' : 'Litet mål'
    case 'pole': return 'Käpp'
    case 'zone': return 'Zon'
    case 'text': return 'Text'
    case 'arrow': return ARROW_NAME[s.style]
  }
}

function ArrowIcon({ style }: { style: ArrowStyle }) {
  const stroke = style === 'shot' ? '#ca8a04' : 'currentColor'
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke={stroke} strokeWidth={style === 'shot' ? 2.2 : 1.6} strokeLinecap="round">
      {style === 'dribble'
        ? <path d="M1,6 Q3,2 5,6 T9,6 T13,6 L15,6" />
        : <path d="M1,6 L15,6" strokeDasharray={style === 'run' ? '3 2' : undefined} />}
      <path d="M12,3 L16,6 L12,9" />
    </svg>
  )
}
