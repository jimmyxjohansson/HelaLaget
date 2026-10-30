'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGetMatches } from '../hooks/backend/matches'
import { usePersistentState } from '../hooks/usePersistentState'
import { Search, MapPin, ChevronRight, Home, Plane, Plus } from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import SquadLogo from '../components/SquadLogo'
interface Match {
  id: number
  matchtype: string
  date: string
  homeaway: string
  ourgoals: number
  theirgoals: number
  matchplayers: string
  indooroutdoor: string
  outcome: string
  status: string
  location: string
  notes: string | null
  teamname: string
  league: number | null
  cup: number | null
  cupphase: string | null
  difficulty: string | null
  fogisregistered: boolean
  opponent: string
  opponent_img: string | null
  league_name: string | null
  players_coming: string
}

const TYPE_FILTERS = ['Alla', 'Serie', 'Cup', 'Träning']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('sv-SE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  })
}

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function outcomeColor(outcome: string): string {
  if (outcome === 'Vinst') return 'bg-emerald-500'
  if (outcome === 'Förlust') return 'bg-red-500'
  if (outcome === 'Oavgjort') return 'bg-amber-500'
  return 'bg-muted'
}

function outcomeText(outcome: string): string {
  if (outcome === 'Vinst') return 'V'
  if (outcome === 'Förlust') return 'F'
  if (outcome === 'Oavgjort') return 'O'
  return '–'
}

function matchTypeColor(type: string): string {
  if (type === 'Serie') return '#2563eb'
  if (type === 'Cup') return '#d97706'
  if (type === 'Träning') return '#7c3aed'
  return '#6b7280'
}

function parseTeamSuffix(teamname: string) {
  if (!teamname) return null
  const parts = teamname.split(':')
  return parts[1]?.trim() || null
}

export default function Matches() {
  const { data, loading, trigger } = useGetMatches()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = usePersistentState('matches.typeFilter', 'Alla')
  const [timeFilter, setTimeFilter] = usePersistentState<'coming' | 'recent' | 'all'>('matches.timeFilter', 'coming')

  useEffect(() => { trigger({ limit: 300 }) }, [])

  const matches = data as unknown as Match[] | undefined

  // Summary stats
  const played = (matches ?? []).filter(m => m.status === 'Avslutad')
  const wins = played.filter(m => m.outcome === 'Vinst').length
  const losses = played.filter(m => m.outcome === 'Förlust').length
  const draws = played.filter(m => m.outcome === 'Oavgjort').length
  const goalsFor = played.reduce((s, m) => s + (m.ourgoals ?? 0), 0)
  const goalsAgainst = played.reduce((s, m) => s + (m.theirgoals ?? 0), 0)

  const filtered = (matches ?? []).filter(m => {
    if (typeFilter !== 'Alla' && m.matchtype !== typeFilter) return false
    if (timeFilter === 'coming' && m.status === 'Avslutad') return false
    if (timeFilter === 'coming' && m.fogisregistered && m.matchtype === 'Serie') return false
    if (timeFilter === 'recent') {
      if (m.status !== 'Avslutad') return false
      const matchDate = new Date(m.date)
      const cutoff = new Date()
      cutoff.setUTCHours(0, 0, 0, 0)
      cutoff.setUTCDate(cutoff.getUTCDate() - 14)
      if (matchDate < cutoff) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return (
        (m.opponent ?? '').toLowerCase().includes(q) ||
        (m.league_name ?? '').toLowerCase().includes(q) ||
        (m.notes ?? '').toLowerCase().includes(q) ||
        formatDate(m.date).toLowerCase().includes(q)
      )
    }
    return true
  })

  // Sort: coming = ascending (earliest first), recent/all = descending (newest first)
  const sorted = [...filtered].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
    return timeFilter === 'coming' ? diff : -diff
  })

  // Group by month
  const grouped: Record<string, Match[]> = {}
  for (const m of sorted) {
    const key = monthLabel(m.date)
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(m)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <SquadLogo />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Matcher</h1>
              <p className="text-team-accent/70 text-sm">{played.length} spelade</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/matches/new')}
              className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
              aria-label="Lägg till match"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary row */}
        {played.length > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">{wins}</span>
              <span className="text-xs text-team-accent/80">V</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">{draws}</span>
              <span className="text-xs text-team-accent/80">O</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">{losses}</span>
              <span className="text-xs text-team-accent/80">F</span>
            </div>
            <div className="ml-2 text-sm font-bold text-team-accent">{goalsFor}–{goalsAgainst}</div>
            <span className="text-xs text-team-accent/70">mål</span>
          </div>
        )}
      </div>

      {/* Search + filter */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex flex-col gap-2">
        {/* Time filter */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {([['coming', 'Kommande'], ['recent', 'Senaste'], ['all', 'Alla']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTimeFilter(val)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                timeFilter === val
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök motståndare, serie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                typeFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-3 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-2 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Inga matcher hittades</p>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 capitalize">
                {month}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map(m => {
                  const isPlayed = m.status === 'Avslutad'
                  const teamSuffix = parseTeamSuffix(m.teamname)
                  return (
                    <button
                      key={m.id}
                      onClick={() => router.push(`/matches/${m.id}`)}
                      className="w-full text-left bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
                    >
                      {/* Row 1: opponent + result/arrow */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Opponent logo */}
                          {m.opponent_img ? (
                            <img
                              src={m.opponent_img}
                              alt={m.opponent}
                              className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0 bg-muted"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-foreground truncate">{m.opponent}</span>
                              {teamSuffix && (
                                <span className="text-xs text-muted-foreground">{teamSuffix}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span
                                className="text-xs font-semibold text-white px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: matchTypeColor(m.matchtype) }}
                              >
                                {m.matchtype}
                              </span>
                              {m.difficulty && (
                                <span
                                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                                  style={rankStyle(m.difficulty)}
                                >
                                  {m.difficulty}
                                </span>
                              )}
                              {m.homeaway === 'Hemma'
                                ? <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Home className="w-3 h-3" />Hemma</span>
                                : <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Plane className="w-3 h-3" />Borta</span>
                              }
                              <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(m.date)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="text-right">
                            <div className={`text-base font-bold tabular-nums ${isPlayed ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {(m.ourgoals ?? 0)}–{(m.theirgoals ?? 0)}
                            </div>
                          </div>
                          {isPlayed ? (
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${outcomeColor(m.outcome)}`}>
                              {outcomeText(m.outcome)}
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Row 2: extra info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.league_name && (
                          <span className="text-xs text-muted-foreground">{m.league_name}</span>
                        )}
                        {m.matchplayers && (
                          <span className="text-xs text-muted-foreground">{m.matchplayers}</span>
                        )}
                        {m.location && m.location !== '-' && m.location !== '' && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />{m.location}
                          </span>
                        )}
                        {m.notes && (
                          <span className="text-xs text-muted-foreground italic">{m.notes}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
