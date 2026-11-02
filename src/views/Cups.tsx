'use client'

import { useRouter } from '../lib/nav'
import { useEffect, useState } from 'react'
import { useGetCups } from '../hooks/backend/cups'
import { usePersistentState } from '../hooks/usePersistentState'
import { Search, MapPin, ChevronRight, Calendar, Trophy } from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import NewCupButton from '../components/NewCupButton'
import { canEdit } from '../lib/squad-store'
import SquadLogo from '../components/SquadLogo'

interface Cup {
  id: number
  name: string
  startdate: string | null
  enddate: string | null
  location: string | null
  difficulty: string | null
  playtime: number | null
  periods: number | null
  matchplayers: string | null
  indooroutdoor: string | null
  svenskalag: string | null
  status: string
  cupsite: string | null
  match_count: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  const s = new Date(start)
  const sStr = s.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (!end || end === start) {
    return `${sStr} ${s.toLocaleDateString('sv-SE', { year: 'numeric', timeZone: 'UTC' })}`
  }
  const e = new Date(end)
  const eStr = e.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${sStr}–${eStr}`
}

function monthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export default function Cups() {
  const { data, loading, trigger } = useGetCups()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = usePersistentState<'coming' | 'recent' | 'all'>('cups.timeFilter', 'coming')

  useEffect(() => { trigger({ limit: 400 }) }, [])

  const cups = data as unknown as Cup[] | undefined

  const finished = (cups ?? []).filter(c => c.status === 'Avslutad')

  const filtered = (cups ?? []).filter(c => {
    if (timeFilter === 'coming' && c.status === 'Avslutad') return false
    if (timeFilter === 'recent' && c.status !== 'Avslutad') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const at = a.startdate ? new Date(a.startdate).getTime() : 0
    const bt = b.startdate ? new Date(b.startdate).getTime() : 0
    const diff = at - bt
    return timeFilter === 'coming' ? diff : -diff
  })

  const grouped: Record<string, Cup[]> = {}
  for (const c of sorted) {
    const key = c.startdate ? monthLabel(c.startdate) : 'Utan datum'
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(c)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <SquadLogo />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Cuper</h1>
              <p className="text-team-accent/70 text-sm">{finished.length} spelade</p>
            </div>
          </div>
          {canEdit() && <NewCupButton />}
        </div>
      </div>

      {/* Search + filter */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex flex-col gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {([['coming', 'Kommande'], ['recent', 'Spelade'], ['all', 'Alla']] as const).map(([val, label]) => (
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
            placeholder="Sök cup, plats..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
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
          <p className="text-center text-muted-foreground py-10 text-sm">Inga cuper hittades</p>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 capitalize">
                {month}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map(c => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/cups/${c.id}`)}
                    className="w-full text-left bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-foreground truncate">{c.name}</span>
                            {c.difficulty && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={rankStyle(c.difficulty)}
                              >
                                {c.difficulty}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {c.startdate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />{formatDateRange(c.startdate, c.enddate)}
                              </span>
                            )}
                            {c.matchplayers && (
                              <span className="text-xs text-muted-foreground">{c.matchplayers}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {c.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{c.location}
                        </span>
                      )}
                      {c.match_count > 0 && (
                        <span className="text-xs text-muted-foreground">{c.match_count} matcher</span>
                      )}
                      {c.status === 'Avslutad' && c.match_count > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full bg-emerald-500">{c.wins}V</span>
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full bg-amber-500">{c.draws}O</span>
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full bg-red-500">{c.losses}F</span>
                          <span className="text-xs font-semibold text-foreground tabular-nums ml-0.5">{c.goals_for}–{c.goals_against}</span>
                        </span>
                      )}
                    </div>
                  </button>
             ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
