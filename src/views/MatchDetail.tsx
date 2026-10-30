'use client'

import { useEffect, useState, Fragment, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGetMatch, useUpdateMatchFogisRegistered, useDeleteMatch, useGetMatchesVsOpponent, useSyncParticipantsFromCup } from '../hooks/backend/matches'
import { ArrowLeft, MapPin, Users, Clock, User, Pencil, ExternalLink, UserCog, MoreVertical, Trash2, Calendar, Trophy, Download, RefreshCw } from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '../lib/shadcn/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../lib/shadcn/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../lib/shadcn/alert-dialog'
import { ownTeamLogoUrl, ownTeamName } from '../utils/constants'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface MatchData {
  id: number
  matchtype: string
  date: string
  homeaway: string
  ourgoals: number
  theirgoals: number
  matchplayers: string | null
  indooroutdoor: string
  outcome: string
  status: string
  location: string | null
  notes: string | null
  teamname: string | null
  league_name: string | null
  cup: number | null
  cup_name: string | null
  cupphase: string | null
  difficulty: string | null
  playtime: number | null
  periods: number | null
  opponent: string | null
  opponent_img: string | null
  fogislink: string | null
  fogisno: string | null
  fogisregistered: boolean | null
  svenskalag: string | null
  vs: number | null
}

interface OpponentMatch {
  id: number
  date: string
  outcome: string
  ourgoals: number
  theirgoals: number
  homeaway: string
  difficulty: string | null
  matchtype: string
  status: string
  league_name: string | null
  cup_name: string | null
}

interface Participant {
  id: number
  player: number | null
  goals: number
  assists: number
  saves: number
  status: string
  position: string | null
  reason: string | null
  shortname: string | null
  firstname: string | null
  lastname: string | null
  img: string | null
  number: number | null
}

interface MatchEvent {
  id: number
  goal: number | null
  assist: number | null
  save: number | null
  minute: number | null
  ourgoal: number
  theirgoal: number
  type: string | null
  goal_name: string | null
  assist_name: string | null
  save_name: string | null
}

interface MatchResult {
  match: MatchData | null
  participants: Participant[]
  events: MatchEvent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tab        = 'handelser' | 'deltagare' | 'information'
type FilterKind = 'goal' | 'save'
type EventKind  = 'our_goal' | 'their_goal' | 'save'

function classifyEvent(e: MatchEvent): EventKind {
  if (e.save !== null) return 'save'
  // An own goal (Självmål) is recorded without a scorer but still counts for us.
  if (e.goal !== null || e.type === 'Självmål') return 'our_goal'
   return 'their_goal'
}

function outcomeStyle(outcome: string) {
  if (outcome === 'Vinst')    return { bg: '#16a34a', label: 'Vinst' }
  if (outcome === 'Förlust')  return { bg: '#dc2626', label: 'Förlust' }
  if (outcome === 'Oavgjort') return { bg: '#d97706', label: 'Oavgjort' }
  return null
}

function matchTypeColor(type: string): string {
  if (type === 'Serie')   return '#2563eb'
  if (type === 'Cup')     return '#d97706'
  if (type === 'Träning') return '#7c3aed'
  return '#6b7280'
}

function parseTeamSuffix(teamname: string | null) {
  if (!teamname) return null
  const parts = teamname.split(':')
  return parts[1]?.trim() || null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, loading, trigger } = useGetMatch()
  const { trigger: triggerUpdateFogis } = useUpdateMatchFogisRegistered()
  const { trigger: triggerDeleteMatch, loading: deleting } = useDeleteMatch()
  const { trigger: triggerSyncFromCup, loading: syncing } = useSyncParticipantsFromCup()
  const [activeTab,  setActiveTab]  = useState<Tab>('handelser')
  const [filters,    setFilters]    = useState<Set<FilterKind>>(new Set(['goal']))
  const [fogisRegistered, setFogisRegistered] = useState<boolean>(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false)
  const { data: opponentMatches, loading: loadingHistory, trigger: triggerHistory } = useGetMatchesVsOpponent()

  useEffect(() => {
    if (id) trigger({ id: Number(id) })
  }, [id])

  const result       = data as unknown as MatchResult | undefined
  const match        = result?.match
  const participants = result?.participants ?? []
  const events       = result?.events ?? []

  useEffect(() => {
    if (match) setFogisRegistered(!!match.fogisregistered)
  }, [match?.id, match?.fogisregistered])

  async function handleToggleFogisRegistered(next: boolean) {
    if (!match) return
    setFogisRegistered(next)
    try {
      await triggerUpdateFogis({ id: match.id, fogisregistered: next })
    } catch {
      setFogisRegistered(!next)
    }
  }

  function openHistory() {
    if (!match?.vs) return
    setHistoryOpen(true)
    triggerHistory({ vs: match.vs })
  }

  async function handleSyncFromCup() {
    if (!match) return
    try {
      await triggerSyncFromCup({ match: match.id })
      setConfirmSyncOpen(false)
      trigger({ id: match.id })
    } catch {
      // keep dialog open on failure
    }
  }

  async function handleDelete() {
    if (!match) return
    try {
      await triggerDeleteMatch({ id: match.id })
      setConfirmDeleteOpen(false)
      router.push('/matches')
    } catch {
      // keep dialog open on failure
    }
  }

  const isPlayed  = match?.status === 'Avslutad'
  const isHome    = match?.homeaway === 'Hemma'
  const teamSuffix = parseTeamSuffix(match?.teamname ?? null)
  const outcome    = match ? outcomeStyle(match.outcome) : null

  const d       = match ? new Date(match.date) : null
  const dateStr = d?.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) ?? ''
  const timeStr = d?.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) ?? ''

  const comingPlayers = participants.filter(p => p.status === 'Kommer')

  function toggleFilter(f: FilterKind) {
    setFilters(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  const filteredEvents = [...events].reverse().filter(e => {
    const kind = classifyEvent(e)
    return kind === 'save' ? filters.has('save') : filters.has('goal')
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'handelser',   label: 'Händelser' },
    { key: 'deltagare',   label: 'Deltagare' },
    { key: 'information', label: 'Information' },
  ]
  
  return (
    <div className="flex flex-col min-h-full">

      {/* ── Green hero header ─────────────────────────────────────── */}
      <div className="text-team-accent px-4 pt-6 pb-4" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-team-accent/80 hover:text-team-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Tillbaka</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (id) trigger({ id: Number(id) }, { skipCache: true }) }}
              disabled={loading}
              aria-label="Uppdatera"
              title="Uppdatera"
              className="flex items-center justify-center w-8 h-8 rounded-full text-team-accent/80 hover:text-team-accent hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Meny"
                className="flex items-center justify-center w-8 h-8 rounded-full text-team-accent/80 hover:text-team-accent hover:bg-white/10 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => router.push(`/matches/${id}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Redigera
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={fogisRegistered}
                onCheckedChange={(v) => handleToggleFogisRegistered(!!v)}
                onSelect={(e) => e.preventDefault()}
              >
                Registrerad i Fogis
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setConfirmDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Radera match
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>

          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
			    <AlertDialogTitle>Radera matchen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta tar bort matchen, alla deltagare och händelser permanent. Åtgärden kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleDelete() }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Raderar…' : 'Radera'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {loading || !match ? (
          <div className="h-24 animate-pulse rounded-xl bg-white/10" />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Type + league */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                style={{ backgroundColor: matchTypeColor(match.matchtype) }}
              >
                {match.matchtype}
              </span>
              {teamSuffix && (
                <span className="text-xs font-semibold text-team-accent/80 bg-white/10 px-2 py-0.5 rounded-full">
                  {teamSuffix}
                </span>
              )}
              {match.league_name && (
                <span className="text-xs text-team-accent/70 truncate">{match.league_name}</span>
              )}
            </div>

            {/* Match card */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-14 h-14 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                  <img
                    src={ownTeamLogoUrl()}
                    alt={ownTeamName()}
                    className="w-12 h-12 object-contain"
                  />
				   </div>
                <span className="text-xs text-team-accent/80 font-medium text-center leading-tight">{ownTeamName()}</span>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <div className={`text-3xl font-black tabular-nums ${isPlayed ? 'text-team-accent' : 'text-team-accent/60'}`}>
                  {match.ourgoals ?? 0} – {match.theirgoals ?? 0}
                </div>
                {isPlayed && outcome && (
                  <span
                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: outcome.bg }}
                  >
                    {outcome.label}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 ${
                    isHome ? 'bg-green-500/30 text-green-200' : 'bg-orange-500/30 text-orange-200'
                  }`}
                >
                  {isHome ? 'Hemma' : 'Borta'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 flex-1">
                <button
                  type="button"
                  onClick={openHistory}
                  disabled={!match.vs}
                  aria-label="Visa tidigare möten"
                  className="w-14 h-14 rounded-full bg-white/10 overflow-hidden flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:cursor-default disabled:hover:scale-100"
                >
                  {match.opponent_img ? (
                    <img src={match.opponent_img} alt={match.opponent ?? ''} className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-2xl font-bold text-team-accent">{(match.opponent ?? '?')[0]}</span>
                  )}
                </button>
                <span className="text-xs text-team-accent/80 font-medium text-center leading-tight">{match.opponent ?? '–'}</span>
              </div>
            </div>

            {/* Date / time / location */}
            <div className="flex items-center gap-3 text-xs text-team-accent/70 flex-wrap">
              <span className="capitalize">{dateStr}</span>
              <span className="font-semibold text-team-accent">{timeStr}</span>
              {match.location && match.location !== '-' && match.location !== '' && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />{match.location}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
	  
      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className="flex border-b border-border bg-background sticky top-0 z-10">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
              activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: 'rgb(var(--team-primary))' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      {!loading && match && (
        <div className="flex flex-col gap-4 p-4 pb-8">

          {/* ── Deltagare ── */}
          {activeTab === 'deltagare' && (
            <>
              {comingPlayers.length > 0 ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="divide-y divide-border">
                    {isPlayed && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-muted/40">
                        <div className="w-6 flex-shrink-0" />
                        <div className="flex-1" />
                        <div className="w-6 text-center text-[10px] font-semibold text-muted-foreground">M</div>
                        <div className="w-6 text-center text-[10px] font-semibold text-muted-foreground">A</div>
                        <div className="w-6 text-center text-[10px] font-semibold text-muted-foreground">R</div>
                        <div className="w-8" />
                      </div>
                    )}
                    {comingPlayers.map(p => (
                      <div
                        key={p.id}
                        onClick={() => p.player && router.push(`/players/${p.player}`)}
                        className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${p.player ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/70' : ''}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                          {p.img ? (
                            <img src={p.img} alt={p.shortname ?? ''} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
							  <User className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                          <span className="text-xs font-medium text-foreground truncate">{p.firstname ?? '–'} {p.lastname ?? '–'}</span>
                          {p.position && <span className="text-[10px] text-muted-foreground">{p.position}</span>}
                        </div>
                        {isPlayed && (
                          <>
                            <div className="w-6 text-center">
                              {p.goals > 0
                                ? <span className="text-xs font-bold text-foreground">{p.goals}</span>
                                : <span className="text-xs text-muted-foreground/40">–</span>}
                            </div>
                            <div className="w-6 text-center">
                              {p.assists > 0
                                ? <span className="text-xs font-bold text-foreground">{p.assists}</span>
                                : <span className="text-xs text-muted-foreground/40">–</span>}
                            </div>
                            <div className="w-6 text-center">
                              {p.saves > 0
                                ? <span className="text-xs font-bold text-foreground">{p.saves}</span>
                                : <span className="text-xs text-muted-foreground/40">–</span>}
                            </div>
                          </>
                        )}
                        {p.number != null && (
                          <span className="w-8 text-right text-[10px] text-muted-foreground font-mono">#{p.number}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">Inga deltagare registrerade</div>
              )}

              <button
                onClick={() => router.push(`/matches/${id}/participants`)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                <UserCog className="w-4 h-4" />
                Hantera deltagare & målvakt
              </button>

              {match.cup != null && (
                <button
                  onClick={() => setConfirmSyncOpen(true)}
                  disabled={syncing}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {syncing ? 'Importerar…' : `Importera deltagare från ${match.cup_name ?? 'cupen'}`}
                </button>
              )}
            </>
          )}

          {/* ── Händelser ── */}
          {activeTab === 'handelser' && (
		    <div className="flex flex-col gap-4">

              {/* Filter chips + edit timeline */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  {([
                    { key: 'goal' as FilterKind, label: 'Mål' },
                    { key: 'save' as FilterKind, label: 'Räddningar' },
                  ] as const).map(f => (
                    <button
                      key={f.key}
                      onClick={() => toggleFilter(f.key)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        filters.has(f.key)
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => router.push(`/matches/${match.id}/timeline`)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Redigera tidslinje
                </button>
              </div>

              {/* Timeline */}
              {filteredEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">
                  Inga händelser registrerade
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical spine */}
                  <div className="absolute left-1/2 top-2 bottom-2 w-px bg-border -translate-x-1/2 z-0" />

                  <div className="flex flex-col divide-y divide-border/40">
                    {filteredEvents.map((e, i) => {
                      const kind = classifyEvent(e)
                      const isOurs   = kind === 'our_goal' || kind === 'save'
                      const isTheirs = kind === 'their_goal'
                      const isSave   = kind === 'save'

                      // Period boundaries in the descending (newest-first) list.
                      const pt = match.playtime
                      const pc = match.periods && match.periods > 0 ? match.periods : 1
                      const eventPeriod = pt && e.minute != null
                        ? Math.min(pc, Math.floor(e.minute / pt) + 1)
                        : 1
                      const prev = filteredEvents[i - 1]
                      const prevPeriod = prev && pt && prev.minute != null
                        ? Math.min(pc, Math.floor(prev.minute / pt) + 1)
                        : null
                      const showDivider = pc > 1 && eventPeriod !== prevPeriod

                      return (
                        <Fragment key={e.id}>
                          {showDivider && (
                            <div className="relative z-10 flex items-center gap-3 py-2 bg-background">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                Period {eventPeriod}
                              </span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                          )}
                          <div className="grid grid-cols-[1fr_52px_1fr] items-center py-1 relative z-10">
						
                          {/* Left — our content */}
                          <div className="pr-2 flex flex-col items-end gap-0">
                            {isOurs && (
                              <>
                                <span className="text-[14px] font-semibold text-foreground text-right leading-tight">
                                  {isSave
                                    ? <>{e.save_name} 🧤</>
                                    : (e.goal_name ?? '')}
                                </span>
                                {!isSave && e.assist_name && (
                                  <span className="text-[12px] text-muted-foreground text-right leading-tight">
                                    {e.assist_name}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Center — logo + minute + score */}
                          <div className="flex flex-col items-center gap-0">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-border">
                              {isTheirs ? (
                                match.opponent_img
                                  ? <img src={match.opponent_img} alt={match.opponent ?? ''} className="w-full h-full object-contain" />
                                  : <span className="text-[12px] font-bold text-muted-foreground">{(match.opponent ?? '?')[0]}</span>
                              ) : (
                                <img
                                  src={ownTeamLogoUrl()}
                                  alt={ownTeamName()}
                                  className="w-full h-full object-contain"
                                />
                              )}
                            </div>
                            <span className="text-[12px] font-mono text-muted-foreground leading-tight">
                              {e.minute != null ? `${e.minute}'` : '–'}
                            </span>
                            {!isSave && (
                              <span className="text-[12px] font-bold text-foreground tabular-nums leading-tight">
                                {e.ourgoal}–{e.theirgoal}
                              </span>
                            )}
                          </div>

                          {/* Right — their content */}
                          <div className="pl-2 flex flex-col items-start gap-0">
                            {isTheirs && (
                              <span className="text-xs font-semibold text-muted-foreground leading-tight">
                                {match.opponent ?? '–'}
                              </span>
                            )}
                          </div>
						  
                        </div>
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Information ── */}
          {activeTab === 'information' && (
            <div className="flex flex-col gap-3">
              <div className="bg-card border border-border rounded-xl divide-y divide-border">
                {match.teamname && (
                  <InfoRow icon={<Users className="w-4 h-4" />} label="Lagnamn" value={match.teamname} />
                )}
                {match.matchtype === 'Cup' && match.cup_name && (
                  <InfoRow icon={<Trophy className="w-4 h-4" />} label="Cup" value={match.cup_name} />
                )}
                {match.matchtype === 'Cup' && match.cupphase && (
                  <InfoRow icon={<Trophy className="w-4 h-4" />} label="Cupfas" value={match.cupphase} />
                )}
                {match.matchtype === 'Serie' && match.fogisno && (
                  <InfoRow icon={<Calendar className="w-4 h-4" />} label="Matchnummer" value={match.fogisno} />
                )}
                {match.matchplayers && (
                  <InfoRow icon={<Users className="w-4 h-4" />} label="Spelform" value={match.matchplayers} />
                )}
                {match.indooroutdoor && (
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="Miljö" value={match.indooroutdoor} />
                )}
                {match.playtime && (
                  <InfoRow icon={<Clock className="w-4 h-4" />} label="Speltid" value={`${match.periods} × ${match.playtime} min`} />
                )}
                {match.difficulty && (
                  <InfoRow
                    icon={<Trophy className="w-4 h-4" />}
                    label="Nivå"
                    value={
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={rankStyle(match.difficulty)}>
                        {match.difficulty}
                      </span>
                    }
                  />
                )}
                {match.location && (
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="Plan" value={match.location} />
                )}
              </div>
			  
              {(match.fogislink || match.svenskalag) && (
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
                  {match.matchtype === 'Serie' && match.fogislink && (
                    <a href={match.fogislink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="w-4 h-4" />Öppna i Fogis
                    </a>
                  )}
                  {match.svenskalag && (
                    <a href={match.svenskalag} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="w-4 h-4" />Öppna på svenskalag.se
                    </a>
                  )}
                </div>
              )}

              {match.notes && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Anteckningar</p>
                  <p className="text-sm text-foreground">{match.notes}</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── Import cup participants confirm ────────────────────── */}
      <AlertDialog open={confirmSyncOpen} onOpenChange={setConfirmSyncOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importera deltagare från cupen?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta tar bort alla nuvarande deltagare i matchen och ersätter dem med spelarna
              från {match?.cup_name ?? 'cupen'} som har statusen ”Kommer”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncing}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSyncFromCup() }}
              disabled={syncing}
            >
              {syncing ? 'Importerar…' : 'Importera'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Previous matches vs opponent ──────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {match?.opponent_img && (
                <img src={match.opponent_img} alt="" className="w-6 h-6 object-contain" />
              )}
              Tidigare möten mot {match?.opponent ?? '–'}
            </DialogTitle>
          </DialogHeader>

          {loadingHistory ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Laddar…</p>
          ) : (opponentMatches as OpponentMatch[] | undefined)?.length ? (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-2 font-semibold">Datum</th>
                    <th className="py-2 pr-2 font-semibold">Status</th>
                    <th className="py-2 pr-2 font-semibold">Utfall</th>
                    <th className="py-2 pr-2 font-semibold">Resultat</th>
                    <th className="py-2 pr-2 font-semibold">Nivå</th>
                    <th className="py-2 font-semibold">Cup / Serie</th>
                  </tr>
                </thead>
                <tbody>
                  {(opponentMatches as OpponentMatch[]).map(om => {
                    const oc = outcomeStyle(om.outcome)
                    return (
                      <tr
                        key={om.id}
                        onClick={() => { setHistoryOpen(false); router.push(`/matches/${om.id}`) }}
                        className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40"
                      >
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {new Date(om.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                        </td>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={om.status === 'Avslutad'
                              ? { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                              : { backgroundColor: '#2563eb', color: '#fff' }}
                          >
                            {om.status}
                          </span>
                        </td>
                        <td className="py-2 pr-2">
                          {om.status === 'Avslutad' && oc ? (
                            <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: oc.bg }}>
                              {oc.label}
                            </span>
                          ) : '–'}
                        </td>
                        <td className="py-2 pr-2 font-semibold tabular-nums">{om.status === 'Avslutad' ? `${om.ourgoals} – ${om.theirgoals}` : '–'}</td>
                        <td className="py-2 pr-2">
                          {om.difficulty ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={rankStyle(om.difficulty)}>
                              {om.difficulty}
                            </span>
                          ) : '–'}
                        </td>
                        <td className="py-2 text-muted-foreground">{om.cup_name ?? om.league_name ?? '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Inga tidigare möten.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  )
}
