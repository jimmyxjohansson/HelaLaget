'use client'

import { Check, ChevronRight, Home, MapPin, Plane } from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import LiveScore, { type LiveMatch } from './LiveScore'

/** Det ett matchkort behöver (från getMatches eller getUpcomingMatches). */
export type MatchCardData = LiveMatch & {
  id: number
  matchtype: string
  date: string
  homeaway: string
  outcome: string | null
  status: string | null
  location: string | null
  notes: string | null
  teamname: string | null
  difficulty?: string | null
  matchplayers?: string | null
  opponent: string | null
  opponent_img: string | null
  league_name: string | null
  /** Spelare med svar Kommer */
  players_coming?: number | string | null
}

/** Grön bricka med antal spelare som svarat Kommer. */
export function ComingBadge({ count, className = '' }: { count: number; className?: string }) {
  return (
    <span title={`${count} ${count === 1 ? 'spelare' : 'spelare'} har svarat Kommer`}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${count ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'} ${className}`}>
      <Check className="w-3 h-3" />{count} kommer
    </span>
  )
}

export function matchTypeColor(type: string): string {
  if (type === 'Serie') return '#2563eb'
  if (type === 'Cup') return '#d97706'
  if (type === 'Träning') return '#7c3aed'
  return '#6b7280'
}

function parseTeamSuffix(teamname: string | null) {
  if (!teamname) return null
  const parts = teamname.split(':')
  return parts[1]?.trim() || null
}

/** Tider sparas som väggklocka i UTC. */
export function formatMatchDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
export function formatMatchTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
}

function outcomeColor(outcome: string | null): string {
  if (outcome === 'Vinst') return 'bg-emerald-500'
  if (outcome === 'Förlust') return 'bg-red-500'
  if (outcome === 'Oavgjort') return 'bg-amber-500'
  return 'bg-muted'
}

function outcomeText(outcome: string | null): string {
  if (outcome === 'Vinst') return 'V'
  if (outcome === 'Förlust') return 'F'
  if (outcome === 'Oavgjort') return 'O'
  return '–'
}

/**
 * Matchkortet på startsidan och i matchlistan: motståndare, typ, nivå,
 * hemma/borta och tid. Till höger liveresultat med klocka, slutresultat
 * eller en pil för kommande matcher.
 */
export default function MatchCard({ m, onClick }: { m: MatchCardData; onClick: () => void }) {
  const isPlayed = m.status === 'Avslutad' || m.status === 'Registrerad i Fogis'
  const teamSuffix = parseTeamSuffix(m.teamname)
  const coming = m.players_coming == null ? null : Number(m.players_coming)
  const showComing = coming != null && (coming > 0 || !isPlayed)
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl px-3 py-2.5 flex flex-col gap-1.5 border ${m.live ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-900' : 'bg-primary/10 border-primary/20'}`}
    >
      {/* Rad 1: motståndare + resultat/pil */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {m.opponent_img ? (
            <img src={m.opponent_img} alt={m.opponent ?? ''} className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0 bg-muted" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-foreground truncate">{m.opponent ?? '–'}</span>
              {teamSuffix && <span className="text-xs text-muted-foreground">{teamSuffix}</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-xs font-semibold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: matchTypeColor(m.matchtype) }}>
                {m.matchtype}
              </span>
              {m.difficulty && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={rankStyle(m.difficulty)}>{m.difficulty}</span>
              )}
              {m.homeaway === 'Hemma'
                ? <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Home className="w-3 h-3" />Hemma</span>
                : <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Plane className="w-3 h-3" />Borta</span>}
              <span className="text-xs text-muted-foreground">{formatMatchDate(m.date)}</span>
              <span className="text-xs text-muted-foreground">{formatMatchTime(m.date)}</span>
            </div>
          </div>
        </div>

        {m.live ? (
          <LiveScore m={m} />
        ) : isPlayed ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-base font-bold tabular-nums text-foreground">{m.ourgoals ?? 0}–{m.theirgoals ?? 0}</span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${outcomeColor(m.outcome)}`}>
              {outcomeText(m.outcome)}
            </span>
          </div>
        ) : (m.ourgoals || m.theirgoals) ? (
          // Mål registrerade men matchen är inte satt till Avslutad
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="flex flex-col items-end leading-tight">
              <span className="text-base font-bold tabular-nums text-foreground">{m.ourgoals ?? 0}–{m.theirgoals ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">ej avslutad</span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Rad 2: serie, spelform, plats, anteckning */}
      <div className="flex items-center gap-2 flex-wrap">
        {m.league_name && <span className="text-xs text-muted-foreground">{m.league_name}</span>}
        {m.matchplayers && <span className="text-xs text-muted-foreground">{m.matchplayers}</span>}
        {m.location && m.location !== '-' && m.location !== '' && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{m.location}</span>
        )}
        {m.notes && <span className="text-xs text-muted-foreground italic">{m.notes}</span>}
        {showComing && <ComingBadge count={coming!} className="ml-auto" />}
      </div>
    </button>
  )
}
