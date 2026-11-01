'use client'

import { useId, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react'
import { CONE_HEX, TEAM_HEX, unit, type Diagram, type Pt, type Shape } from '../../utils/diagram'

const PAD = 1.5 // meter runt planen

type Props = {
  diagram: Diagram
  className?: string
  /** Markerad figur (i redigeringsläget). */
  selectedId?: string | null
  /** Extra innehåll ovanpå (förhandsvisning när man ritar). */
  overlay?: ReactNode
  svgRef?: Ref<SVGSVGElement>
  onPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void
  title?: string
}

/** Ritningen som SVG. Används både för att visa och för att redigera. */
export default function DrillDiagram({ diagram, className, selectedId, overlay, svgRef, onPointerDown, onPointerMove, onPointerUp, title }: Props) {
  const uid = useId().replace(/:/g, '')
  const { width: w, height: h } = diagram
  const u = unit(diagram)
  const editing = !!onPointerDown

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`}
      className={className}
      style={editing ? { touchAction: 'none', userSelect: 'none' } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label={title ?? 'Övningens uppställning'}
    >
      <defs>
        {(['pass', 'run', 'dribble', 'shot'] as const).map((s) => (
          <marker key={s} id={`${uid}-${s}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={s === 'shot' ? '#fde047' : '#ffffff'} />
          </marker>
        ))}
        <pattern id={`${uid}-grass`} width={Math.max(w, h) / 8} height={h + PAD * 2} patternUnits="userSpaceOnUse" x={-PAD} y={-PAD}>
          <rect width={Math.max(w, h) / 16} height={h + PAD * 2} fill="#2f8f46" />
          <rect x={Math.max(w, h) / 16} width={Math.max(w, h) / 16} height={h + PAD * 2} fill="#2b8541" />
        </pattern>
      </defs>
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} fill={`url(#${uid}-grass)`} rx={u * 0.6} />
      <Markings d={diagram} u={u} />
      {/* Zoner längst ner, pilar under spelarna */}
      {diagram.shapes.filter((s) => s.kind === 'zone').map((s) => <ShapeView key={s.id} s={s} u={u} uid={uid} selected={s.id === selectedId} />)}
      {diagram.shapes.filter((s) => s.kind === 'arrow').map((s) => <ShapeView key={s.id} s={s} u={u} uid={uid} selected={s.id === selectedId} />)}
      {diagram.shapes.filter((s) => s.kind !== 'zone' && s.kind !== 'arrow').map((s) => <ShapeView key={s.id} s={s} u={u} uid={uid} selected={s.id === selectedId} />)}
      {overlay}
    </svg>
  )
}

type Side = 'left' | 'right' | 'top' | 'bottom'

/**
 * Planens linjer. Liggande plan har målen på kortsidorna till vänster och
 * höger, stående uppe och nere. På halvplan hamnar straffområdet vid det
 * stora mål som finns på ritningen (annars höger respektive uppe).
 */
function Markings({ d, u }: { d: Diagram; u: number }) {
  const { width: w, height: h } = d
  const portrait = h > w
  const line = { stroke: 'rgba(255,255,255,0.85)', strokeWidth: Math.max(0.12, u * 0.12), fill: 'none' }
  const box = (side: Side) => {
    const depth = Math.min(along * (d.pitch === 'half' ? 0.32 : 0.16), 16.5)
    const bw = Math.min(across * 0.6, 40.3)
    if (side === 'left') return <rect key={side} x={0} y={(h - bw) / 2} width={depth} height={bw} {...line} />
    if (side === 'right') return <rect key={side} x={w - depth} y={(h - bw) / 2} width={depth} height={bw} {...line} />
    if (side === 'top') return <rect key={side} x={(w - bw) / 2} y={0} width={bw} height={depth} {...line} />
    return <rect key={side} x={(w - bw) / 2} y={h - depth} width={bw} height={depth} {...line} />
  }
  let goalSide: Side = portrait ? 'top' : 'right'
  const big = d.shapes.find((s) => s.kind === 'goal' && s.size === 'large')
  if (big && big.kind === 'goal') {
    // Målets nät pekar ut från planen: 0° = uppe, 90° = höger, 180° = nere, 270° = vänster
    const rot = ((Math.round(big.rot / 90) * 90) % 360 + 360) % 360
    goalSide = rot === 0 ? 'top' : rot === 90 ? 'right' : rot === 180 ? 'bottom' : 'left'
  }
  const arc = (side: Side) => {
    // Halv mittcirkel vid mittlinjen (motsatt sida mot målet)
    if (side === 'left') return `M0,${h / 2 - r} A${r},${r} 0 0 1 0,${h / 2 + r}`
    if (side === 'right') return `M${w},${h / 2 - r} A${r},${r} 0 0 0 ${w},${h / 2 + r}`
    if (side === 'top') return `M${w / 2 - r},0 A${r},${r} 0 0 0 ${w / 2 + r},0`
    return `M${w / 2 - r},${h} A${r},${r} 0 0 1 ${w / 2 + r},${h}`
  }
  // Målen på kortsidorna, eller där de stora målen står
  const vertical = big ? goalSide === 'top' || goalSide === 'bottom' : portrait
  const along = vertical ? h : w // planens längd
  const across = vertical ? w : h // planens bredd
  const r = Math.min(across * 0.14, 9.15)
  const opposite: Record<Side, Side> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={w} height={h} {...line} />
      {d.pitch === 'full' && (
        <>
          {vertical ? <line x1={0} y1={h / 2} x2={w} y2={h / 2} {...line} /> : <line x1={w / 2} y1={0} x2={w / 2} y2={h} {...line} />}
          <circle cx={w / 2} cy={h / 2} r={r} {...line} />
          {vertical ? [box('top'), box('bottom')] : [box('left'), box('right')]}
        </>
      )}
      {d.pitch === 'half' && (
        <>
          <path d={arc(opposite[goalSide])} {...line} />
          {box(goalSide)}
        </>
      )}
    </g>
  )
}

function arrowPath(from: Pt, to: Pt, bend = 0) {
  if (!bend) return `M${from.x},${from.y} L${to.x},${to.y}`
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const cx = mx - (dy / len) * bend
  const cy = my + (dx / len) * bend
  return `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`
}

function wavyPath(from: Pt, to: Pt, u: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 0.1) return ''
  const nx = -dy / len
  const ny = dx / len
  const amp = u * 0.35
  const waveLen = u * 1.6
  const steps = Math.max(8, Math.floor((len / waveLen) * 8))
  const tail = Math.min(len * 0.2, u * 1.4) // rak bit sist, så att pilen syns
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (len - tail)
    const a = Math.sin((t / waveLen) * Math.PI * 2) * amp
    pts.push(`${from.x + (dx / len) * t + nx * a},${from.y + (dy / len) * t + ny * a}`)
  }
  pts.push(`${to.x},${to.y}`)
  return `M${pts.join(' L')}`
}

function ShapeView({ s, u, uid, selected }: { s: Shape; u: number; uid: string; selected: boolean }) {
  const sel = selected ? { filter: 'drop-shadow(0 0 0.35px #fff) drop-shadow(0 0 0.6px #fde047)' } : undefined
  switch (s.kind) {
    case 'cone': {
      const r = u * 0.55
      return (
        <g data-id={s.id} style={sel}>
          <path d={`M${s.x},${s.y - r * 1.1} L${s.x + r},${s.y + r * 0.7} L${s.x - r},${s.y + r * 0.7} z`} fill={CONE_HEX[s.color]} stroke="rgba(0,0,0,0.45)" strokeWidth={u * 0.06} />
          {/* större träffyta */}
          <circle cx={s.x} cy={s.y} r={r * 1.4} fill="transparent" />
        </g>
      )
    }
    case 'player': {
      const r = u * 0.95
      const c = TEAM_HEX[s.team]
      return (
        <g data-id={s.id} style={sel}>
          <circle cx={s.x} cy={s.y} r={r} fill={c.fill} stroke="#fff" strokeWidth={u * 0.12} />
          {s.label && (
            <text x={s.x} y={s.y} fill={c.text} fontSize={r * (s.label.length > 2 ? 0.8 : 1.05)} fontWeight={700} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif">
              {s.label}
            </text>
          )}
        </g>
      )
    }
    case 'ball': {
      const r = u * 0.45
      return (
        <g data-id={s.id} style={sel}>
          <circle cx={s.x} cy={s.y} r={r} fill="#fff" stroke="#111" strokeWidth={u * 0.08} />
          <circle cx={s.x} cy={s.y} r={r * 0.38} fill="#111" />
          <circle cx={s.x} cy={s.y} r={r * 1.6} fill="transparent" />
        </g>
      )
    }
    case 'goal': {
      const gw = s.size === 'large' ? Math.max(u * 4.5, 5) : u * 2.4
      const gd = s.size === 'large' ? u * 1.3 : u * 0.9
      return (
        <g data-id={s.id} style={sel} transform={`rotate(${s.rot} ${s.x} ${s.y})`}>
          <rect x={s.x - gw / 2} y={s.y - gd} width={gw} height={gd} fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth={u * 0.14} />
          <line x1={s.x - gw / 2} y1={s.y - gd / 2} x2={s.x + gw / 2} y2={s.y - gd / 2} stroke="rgba(255,255,255,0.55)" strokeWidth={u * 0.05} />
        </g>
      )
    }
    case 'pole':
      return (
        <g data-id={s.id} style={sel}>
          <circle cx={s.x} cy={s.y} r={u * 0.3} fill="#fde047" stroke="#111" strokeWidth={u * 0.08} />
          <circle cx={s.x} cy={s.y} r={u * 0.8} fill="transparent" />
        </g>
      )
    case 'zone':
      return (
        <rect data-id={s.id} style={sel} x={Math.min(s.x, s.x + s.w)} y={Math.min(s.y, s.y + s.h)} width={Math.abs(s.w)} height={Math.abs(s.h)}
          fill={CONE_HEX[s.color]} fillOpacity={0.22} stroke={CONE_HEX[s.color]} strokeOpacity={0.9} strokeWidth={u * 0.1} strokeDasharray={`${u * 0.5} ${u * 0.3}`} />
      )
    case 'text':
      return (
        <text data-id={s.id} style={sel} x={s.x} y={s.y} fill="#fff" fontSize={u * 1.1} fontWeight={700} textAnchor="middle" dominantBaseline="central"
          fontFamily="system-ui, sans-serif" paintOrder="stroke" stroke="rgba(0,0,0,0.55)" strokeWidth={u * 0.18}>
          {s.text}
        </text>
      )
    case 'arrow': {
      const color = s.style === 'shot' ? '#fde047' : '#ffffff'
      const d = s.style === 'dribble' ? wavyPath(s.from, s.to, u) : arrowPath(s.from, s.to, s.bend)
      return (
        <g data-id={s.id} style={sel}>
          <path d={d} fill="none" stroke="transparent" strokeWidth={u * 1.2} />
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={s.style === 'shot' ? u * 0.24 : u * 0.16}
            strokeDasharray={s.style === 'run' ? `${u * 0.55} ${u * 0.35}` : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={`url(#${uid}-${s.style})`}
          />
        </g>
      )
    }
  }
}
