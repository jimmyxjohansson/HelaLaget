'use client'

import SyncRepliesButton, { SyncStatusLine, type SyncStatus } from './svar/SyncRepliesButton'
import { canEdit } from '../lib/squad-store'
import { useRouter } from '../lib/nav'
import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useGetCup } from '../hooks/backend/cups'
import { ComingBadge } from '../components/MatchCard'
import {
  ArrowLeft, MapPin, Calendar, Clock, Pencil, Plus, ChevronRight,
  ExternalLink, Trophy, Home, Plane, Users, UserCog,
} from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import { CupAttendeesTable } from '../components/CupAttendeesTable'

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
}

interface CupMatch {
  id: number
  date: string
  matchtype: string
  homeaway: string
  ourgoals: number
  theirgoals: number
  outcome: string
  status: string
  location: string | null
  teamname: string | null
  cupphase: string | null
  matchplayers: string | null
  notes: string | null
  opponent: string | null
  opponent_img: string | null
  /** Spelare med svar Kommer */
  players_coming?: number
}

interface CupParticipant {
  id: number
  shortname: string | null
  firstname: string | null
  lastname: string | null
  img: string | null
  number: number | null
 matches_played: number
  goals: number
  assists: number
  saves: number
}

interface CupResult {
  cup: Cup | null
  matches: CupMatch[]
  participants: CupParticipant[]
}

type Tab = 'matcher' | 'deltagare' | 'narvaro' | 'information'

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
function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  const s = new Date(start)
  const sStr = s.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (!end || end === start) {
    return `${sStr} ${s.toLocaleDateString('sv-SE', { year: 'numeric', timeZone: 'UTC' })}`
  }
  const e = new Date(end)
  const eStr = e.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${sStr} – ${eStr}`
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

export default function CupDetail() {
  // Spelare och Anhörig ser men ändrar inget
  const editor = canEdit()
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, loading, trigger } = useGetCup()
  const [activeTab, setActiveTab] = useState<Tab>('matcher')

  useEffect(() => { if (id) trigger({ id: Number(id) }) }, [id])

  const result = data as unknown as CupResult | undefined
  const cup = result?.cup
  const matches = result?.matches ?? []
  const participants = result?.participants ?? []

  const played = matches.filter(m => m.status === 'Avslutad')
  const wins = played.filter(m => m.outcome === 'Vinst').length
  const draws = played.filter(m => m.outcome === 'Oavgjort').length
  const losses = played.filter(m => m.outcome === 'Förlust').length
  const goalsFor = played.reduce((s, m) => s + (m.ourgoals ?? 0), 0)
  const goalsAgainst = played.reduce((s, m) => s + (m.theirgoals ?? 0), 0)

  if (loading && !cup) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <div className="bg-card rounded-xl h-28 animate-pulse" />
        <div className="bg-card rounded-xl h-20 animate-pulse" />
        <div className="bg-card rounded-xl h-20 animate-pulse" />
      </div>
    )
  }

  if (!cup) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground text-sm">Cupen hittades inte.</p>
        <button onClick={() => router.push('/cups')} className="mt-3 text-primary text-sm underline">
          Tillbaka till cuper
        </button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'matcher', label: 'Matcher' },
    { key: 'deltagare', label: 'Deltagare' },
    { key: 'narvaro', label: 'Spelarförteckning' },
    { key: 'information', label: 'Information' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-4" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
  <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push('/cups')}
            className="flex items-center gap-1 text-team-accent/80 hover:text-team-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Cuper</span>
          </button>
          <div className="flex items-center gap-3">
          {editor && cup.svenskalag && (
            <SyncRepliesButton
              url={cup.svenskalag}
              kind={'cup'}
                id={cup.id}
                onStatus={setSyncStatus}
                onSynced={() => trigger({ id: Number(id) }, { skipCache: true })}
              className="flex items-center justify-center w-8 h-8 rounded-full text-team-accent/80 hover:text-team-accent hover:bg-white/10 transition-colors disabled:opacity-50"
            />
          )}
          {editor && <button
            onClick={() => router.push(`/cups/${cup.id}/edit`)}
            className="flex items-center gap-1 text-team-accent/80 hover:text-team-accent transition-colors"
          >
            <Pencil className="w-4 h-4" />
            <span className="text-sm">Redigera</span>
          </button>}
          </div>
        </div>
        <SyncStatusLine status={syncStatus} onDismiss={() => setSyncStatus(null)} className={`mb-3 w-fit max-w-full rounded-md px-2 py-1 text-xs text-white ${syncStatus?.ok ? 'bg-black/20' : 'bg-black/35'}`} />

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-team-accent/15 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-6 h-6 text-team-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold leading-tight">{cup.name}</h1>
              {cup.difficulty && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={rankStyle(cup.difficulty)}>
                  {cup.difficulty}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1 text-team-accent/80 text-xs">
              {cup.startdate && (
                <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDateRange(cup.startdate, cup.enddate)}</span>
              )}
              {cup.location && (
                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{cup.location}</span>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
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

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 text-sm py-3 font-medium transition-colors border-b-2 ${
              activeTab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-3">
        {activeTab === 'matcher' && (
          <div className="flex flex-col gap-2">
            {editor && <button
              onClick={() => router.push(`/matches/new?cup=${cup.id}`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Lägg till match
            </button>}

            {matches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga matcher kopplade till cupen ännu</p>
            ) : (
              matches.map(m => {
                const isPlayed = m.status === 'Avslutad'
                return (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/matches/${m.id}`)}
                    className="w-full text-left bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
              >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {m.opponent_img ? (
                        <img src={m.opponent_img} alt={m.opponent ?? ''} className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0 bg-muted" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{m.opponent ?? 'Okänd'}</div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {m.homeaway === 'Hemma'
                            ? <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Home className="w-3 h-3" />Hemma</span>
                            : <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Plane className="w-3 h-3" />Borta</span>}
                          <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(m.date)}</span>
                          {m.cupphase && <span className="text-xs text-muted-foreground">{m.cupphase}</span>}
                          {((m.players_coming ?? 0) > 0 || !isPlayed) && <ComingBadge count={m.players_coming ?? 0} />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`text-base font-bold tabular-nums ${isPlayed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {(m.ourgoals ?? 0)}–{(m.theirgoals ?? 0)}
                      </div>
                      {isPlayed ? (
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${outcomeColor(m.outcome)}`}>
                          {outcomeText(m.outcome)}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'deltagare' && (
          <div className="flex flex-col gap-2">
            {editor && <button
              onClick={() => router.push(`/cups/${cup.id}/participants`)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              <UserCog className="w-4 h-4" />
              Hantera deltagare
            </button>}
            {participants.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga deltagare registrerade</p>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Users className="w-3.5 h-3.5" />
                  {participants.length} spelare
                </div>
                {participants.map(p => (
                  <button
				    key={p.id}
                    onClick={() => router.push(`/players/${p.id}`)}
                    className="w-full text-left bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-3"
                  >
                    {p.img ? (
                      <img src={p.img} alt={p.shortname ?? ''} className="w-9 h-9 rounded-full object-cover bg-muted flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                        {p.number ?? '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{p.shortname ?? `${p.firstname ?? ''} ${p.lastname ?? ''}`}</div>
                      <div className="text-xs text-muted-foreground">{p.matches_played} matcher</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <div className="text-center">
                        <div className="font-bold text-foreground tabular-nums">{p.goals}</div>
                        <div className="text-[10px] text-muted-foreground">Mål</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground tabular-nums">{p.assists}</div>
                        <div className="text-[10px] text-muted-foreground">Ass</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground tabular-nums">{p.saves}</div>
                        <div className="text-[10px] text-muted-foreground">Rädd</div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'narvaro' && (
          <CupAttendeesTable cupId={cup.id} />
        )}

        {activeTab === 'information' && (
          <div className="flex flex-col gap-3">
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Datum" value={formatDateRange(cup.startdate, cup.enddate) || '–'} />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Plats" value={cup.location || '–'} />
              <InfoRow icon={<Trophy className="w-4 h-4" />} label="Status" value={cup.status} />
              <InfoRow icon={<Users className="w-4 h-4" />} label="Spelform" value={cup.matchplayers || '–'} />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Miljö" value={cup.indooroutdoor || '–'} />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Speltid" value={cup.playtime != null ? `${cup.playtime} min` : '–'} />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Perioder" value={cup.periods != null ? String(cup.periods) : '–'} />
              <InfoRow
                icon={<Trophy className="w-4 h-4" />}
                label="Nivå"
                value={cup.difficulty ? (
				  <span className="text-xs font-bold px-2 py-0.5 rounded" style={rankStyle(cup.difficulty)}>{cup.difficulty}</span>
                ) : '–'}
              />
            </div>

            {(cup.svenskalag || cup.cupsite) && (
              <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
                {cup.svenskalag && (
                  <a href={cup.svenskalag} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="w-4 h-4" />Svenskalag
                  </a>
                )}
                {cup.cupsite && (
                  <a href={cup.cupsite} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="w-4 h-4" />Cupsite
                  </a>
                )}
              </div>
            )}

            {editor && <button
              onClick={() => router.push(`/cups/${cup.id}/edit`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Redigera information
            </button>}
          </div>
        )}

        <div className="h-4" />
      </div>
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
