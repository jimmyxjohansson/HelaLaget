'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUp, ArrowDown, ChevronsUpDown, Home, Plane, Plus, Pencil, Trash2, Users } from 'lucide-react'
import { useGetLeagueMatches, useUpsertStanding, useDeleteStanding } from '../hooks/backend/leagues'
import { useGetTeams } from '../hooks/backend/teams'
import { rankStyle } from '../utils/rankColors'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../lib/shadcn/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/shadcn/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../lib/shadcn/alert-dialog'

interface LeagueMatch {
  id: number
  date: string
  homeaway: string
  ourgoals: number
  theirgoals: number
  outcome: string
  status: string
  location: string | null
  difficulty: string | null
  opponent: string | null
  opponent_img: string | null
  teamname: string | null
}

interface Standing {
  team: number
  team_name: string | null
  imgurl: string | null
  m: number
  w: number
  d: number
  l: number
  gm: number
  ga: number
  p: number
}

interface Team {
  id: number
  team: string | null
  imgurl: string | null
}

interface LeagueParticipant {
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

interface Result {
  league: { id: number; name: string; status: string } | null
  matches: LeagueMatch[]
  standings: Standing[]
  participants: LeagueParticipant[]
}

type Tab = 'matcher' | 'tabell' | 'deltagare'
const OUR_TEAM_ID = 106

type SortKey = 'date' | 'opponent' | 'homeaway' | 'result' | 'outcome' | 'difficulty' | 'status'
type SortDir = 'asc' | 'desc'

function outcomeStyle(outcome: string) {
  if (outcome === 'Vinst')    return { bg: '#16a34a', label: 'V' }
  if (outcome === 'Förlust')  return { bg: '#dc2626', label: 'F' }
  if (outcome === 'Oavgjort') return { bg: '#d97706', label: 'O' }
  return null
}

function parseTeamSuffix(teamname: string | null) {
  if (!teamname) return null
  const parts = teamname.split(':')
  return parts[1]?.trim() || null
}

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, loading, trigger } = useGetLeagueMatches()
  const { data: teamsData, trigger: fetchTeams } = useGetTeams()
  const { trigger: upsertStanding } = useUpsertStanding()
  const { trigger: deleteStanding } = useDeleteStanding()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [tab, setTab] = useState<Tab>('matcher')
  const [editing, setEditing] = useState<Standing | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Standing | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pSortKey, setPSortKey] = useState<'name' | 'matches' | 'goals' | 'assists' | 'saves' | 'points'>('goals')
  const [pSortDir, setPSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    if (id) trigger({ id: Number(id) })
  }, [id])

  useEffect(() => { fetchTeams({}) }, [])

  const result = data as unknown as Result | undefined
  const league = result?.league
  const matches = useMemo(() => result?.matches ?? [], [result])
  const standings = useMemo(() => result?.standings ?? [], [result])
  const participants = useMemo(() => result?.participants ?? [], [result])

  const sortedParticipants = useMemo(() => {
    const dir = pSortDir === 'asc' ? 1 : -1
    const arr = [...participants]
    arr.sort((a, b) => {
      const nameCmp = (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv')
      if (pSortKey === 'name') return nameCmp * dir
      let cmp = 0
      if (pSortKey === 'matches') cmp = a.matches_played - b.matches_played
      else if (pSortKey === 'goals') cmp = a.goals - b.goals
      else if (pSortKey === 'assists') cmp = a.assists - b.assists
      else if (pSortKey === 'saves') cmp = a.saves - b.saves
      else if (pSortKey === 'points') cmp = (a.goals + a.assists) - (b.goals + b.assists)
      if (cmp !== 0) return cmp * dir
      return nameCmp
    })
    return arr
  }, [participants, pSortKey, pSortDir])

  function togglePSort(key: 'name' | 'matches' | 'goals' | 'assists' | 'saves' | 'points') {
    if (pSortKey === key) {
      setPSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setPSortKey(key)
      setPSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }
  const teams = (teamsData as unknown as Team[] | undefined) ?? []

  function refresh() {
    if (id) trigger({ id: Number(id) }, { skipCache: true })
  }

  function openNewStanding() {
    setEditing({ team: 0, team_name: null, imgurl: null, m: 0, w: 0, d: 0, l: 0, gm: 0, ga: 0, p: 0 })
    setDialogOpen(true)
  }

  function openEditStanding(s: Standing) {
    setEditing(s)
    setDialogOpen(true)
  }

  async function confirmDeleteStanding() {
    if (!deleteTarget || !id) return
    setDeleting(true)
    try {
      await deleteStanding({ league: Number(id), team: deleteTarget.team })
      setDeleteTarget(null)
      refresh()
    } finally {
      setDeleting(false)
    }
  }

  const played = matches.filter(m => m.status === 'Avslutad')
  const wins = played.filter(m => m.outcome === 'Vinst').length
  const draws = played.filter(m => m.outcome === 'Oavgjort').length
  const losses = played.filter(m => m.outcome === 'Förlust').length
  const goalsFor = played.reduce((s, m) => s + (m.ourgoals ?? 0), 0)
  const goalsAgainst = played.reduce((s, m) => s + (m.theirgoals ?? 0), 0)

  const sorted = useMemo(() => {
    const outcomeRank: Record<string, number> = { Vinst: 3, Oavgjort: 2, 'Förlust': 1 }
    const arr = [...matches]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'opponent':
          cmp = (a.opponent ?? '').localeCompare(b.opponent ?? '', 'sv')
          break
        case 'homeaway':
          cmp = (a.homeaway ?? '').localeCompare(b.homeaway ?? '', 'sv')
          break
        case 'result':
          cmp = ((a.ourgoals ?? 0) - (a.theirgoals ?? 0)) - ((b.ourgoals ?? 0) - (b.theirgoals ?? 0))
          break
        case 'outcome':
          cmp = (outcomeRank[a.outcome] ?? 0) - (outcomeRank[b.outcome] ?? 0)
          break
        case 'difficulty':
          cmp = (a.difficulty ?? '').localeCompare(b.difficulty ?? '', 'sv')
          break
        case 'status':
          cmp = (a.status ?? '').localeCompare(b.status ?? '', 'sv')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [matches, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: 'date', label: 'Datum' },
    { key: 'opponent', label: 'Motståndare' },
    { key: 'homeaway', label: 'H/B' },
    { key: 'result', label: 'Resultat' },
    { key: 'outcome', label: 'Utfall' },
    { key: 'difficulty', label: 'Nivå' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-4" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <button
          onClick={() => router.push('/serier')}
          className="flex items-center gap-1 text-team-accent/80 hover:text-team-accent transition-colors mb-3"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Tillbaka</span>
        </button>
        {loading && !league ? (
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{league?.name ?? 'Serie'}</h1>
              {league && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={league.status === 'Aktiv'
                    ? { backgroundColor: '#2563eb', color: '#fff' }
                    : { backgroundColor: 'rgba(255,255,255,0.2)', color: 'rgb(var(--team-accent))' }}
                >
                  {league.status === 'Aktiv' ? 'Pågående' : 'Avslutad'}
                </span>
              )}
            </div>
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
            <p className="text-team-accent/70 text-sm mt-2">{matches.length} matcher</p>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border bg-background sticky top-0 z-10">
        {([['matcher', 'Matcher'], ['tabell', 'Tabell'], ['deltagare', 'Deltagare']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
              tab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: 'rgb(var(--team-primary))' }} />
            )}
          </button>
        ))}
      </div>

      {/* Standings table */}
      {tab === 'tabell' && (
        <div className="flex-1 px-2 py-3">
          <div className="flex justify-end px-1 mb-2">
            <Button size="sm" variant="outline" onClick={openNewStanding} className="gap-1">
              <Plus className="w-4 h-4" /> Lägg till lag
            </Button>
          </div>
          {loading && !result ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Laddar…</p>
          ) : standings.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Ingen tabell tillgänglig. Klicka ”Lägg till lag” för att börja.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pl-2 pr-1 font-semibold">#</th>
                    <th className="py-2 px-1 font-semibold">Lag</th>
                    <th className="py-2 px-1 font-semibold text-center" title="Matcher">M</th>
                    <th className="py-2 px-1 font-semibold text-center" title="Vinster">V</th>
                    <th className="py-2 px-1 font-semibold text-center" title="Oavgjorda">O</th>
                    <th className="py-2 px-1 font-semibold text-center" title="Förluster">F</th>
                    <th className="py-2 px-1 font-semibold text-center whitespace-nowrap" title="Mål">Mål</th>
                    <th className="py-2 px-1 font-semibold text-center" title="Målskillnad">+/-</th>
                    <th className="py-2 px-1 font-semibold text-center" title="Poäng">P</th>
                    <th className="py-2 pr-2 pl-1 font-semibold text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => {
                    const isOurs = s.team === OUR_TEAM_ID
                    const diff = s.gm - s.ga
                    return (
                      <tr
                        key={s.team}
                        className={`border-b border-border last:border-0 ${isOurs ? 'bg-primary/10 font-semibold' : ''}`}
                      >
                        <td className="py-2 pl-2 pr-1 tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {s.imgurl ? (
                              <img src={s.imgurl} alt="" className="w-5 h-5 rounded-full object-cover bg-muted flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-muted flex-shrink-0" />
                            )}
                            <span className="text-foreground truncate">{s.team_name ?? '–'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-1 text-center tabular-nums">{s.m}</td>
                        <td className="py-2 px-1 text-center tabular-nums">{s.w}</td>
                        <td className="py-2 px-1 text-center tabular-nums">{s.d}</td>
                        <td className="py-2 px-1 text-center tabular-nums">{s.l}</td>
                        <td className="py-2 px-1 text-center tabular-nums whitespace-nowrap">{s.gm}–{s.ga}</td>
                        <td className="py-2 px-1 text-center tabular-nums">{diff > 0 ? `+${diff}` : diff}</td>
                        <td className="py-2 pr-1 pl-1 text-center tabular-nums font-bold text-foreground">{s.p}</td>
                        <td className="py-2 pr-2 pl-1 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => openEditStanding(s)}
                              aria-label="Redigera"
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(s)}
                              aria-label="Ta bort"
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Participants */}
      {tab === 'deltagare' && (
        <div className="flex-1 px-2 py-3">
          {loading && !result ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Laddar…</p>
          ) : participants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Inga deltagare registrerade</p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 px-1">
                <Users className="w-3.5 h-3.5" />
                {participants.length} spelare
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pl-2 pr-1 font-semibold">
                        <button onClick={() => togglePSort('name')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Namn {pSortKey === 'name' ? (pSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                        </button>
                      </th>
                      <th className="py-2 px-1 font-semibold text-center">
                        <button onClick={() => togglePSort('matches')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors" title="Matcher">
                          M {pSortKey === 'matches' ? (pSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                        </button>
                      </th>
                      <th className="py-2 px-1 font-semibold text-center">
                        <button onClick={() => togglePSort('goals')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors" title="Mål">
                          Mål {pSortKey === 'goals' ? (pSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                        </button>
                      </th>
                      <th className="py-2 px-1 font-semibold text-center">
                        <button onClick={() => togglePSort('assists')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors" title="Assist">
                          Ass {pSortKey === 'assists' ? (pSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                        </button>
                      </th>
                      <th className="py-2 px-1 font-semibold text-center">
                        <button onClick={() => togglePSort('points')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors" title="Poäng (mål + assist)">
                          P {pSortKey === 'points' ? (pSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                        </button>
                      </th>
                      <th className="py-2 pr-2 pl-1 font-semibold text-center">
                        <button onClick={() => togglePSort('saves')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors" title="Räddningar">
                          Rädd {pSortKey === 'saves' ? (pSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => router.push(`/players/${p.id}`)}
                        className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-1.5 pl-2 pr-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {p.img ? (
                              <img src={p.img} alt="" className="w-6 h-6 rounded-full object-cover bg-muted flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
                            )}
                            <span className="text-foreground truncate">{p.shortname ?? `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim()}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-1 text-center tabular-nums text-muted-foreground">{p.matches_played}</td>
                        <td className="py-1.5 px-1 text-center tabular-nums font-semibold text-foreground">{p.goals}</td>
                        <td className="py-1.5 px-1 text-center tabular-nums">{p.assists}</td>
                        <td className="py-1.5 px-1 text-center tabular-nums font-semibold text-foreground">{p.goals + p.assists}</td>
                        <td className="py-1.5 pr-2 pl-1 text-center tabular-nums">{p.saves}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Matches table */}
      {tab === 'matcher' && (
      <div className="flex-1 px-2 py-3">
        {loading && !result ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Laddar…</p>
        ) : matches.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Inga matcher i serien.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  {columns.map(col => (
                    <th key={col.key} className="py-2 px-2 font-semibold whitespace-nowrap">
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(m => {
                  const oc = outcomeStyle(m.outcome)
                  const isPlayed = m.status === 'Avslutad'
                  const suffix = parseTeamSuffix(m.teamname)
                  return (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/matches/${m.id}`)}
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40"
                    >
                      <td className="py-2 px-2 whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' })}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {m.opponent_img ? (
                            <img src={m.opponent_img} alt="" className="w-5 h-5 rounded-full object-cover bg-muted flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted flex-shrink-0" />
                          )}
                          <span className="font-medium text-foreground truncate">{m.opponent ?? '–'}</span>
                          {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {m.homeaway === 'Hemma'
                          ? <span className="flex items-center gap-0.5 text-muted-foreground"><Home className="w-3 h-3" />H</span>
                          : <span className="flex items-center gap-0.5 text-muted-foreground"><Plane className="w-3 h-3" />B</span>}
                      </td>
                      <td className="py-2 px-2 font-semibold tabular-nums">
                        {isPlayed ? `${m.ourgoals ?? 0}–${m.theirgoals ?? 0}` : '–'}
                      </td>
                      <td className="py-2 px-2">
                        {isPlayed && oc ? (
                          <span className="w-5 h-5 inline-flex items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: oc.bg }}>
                            {oc.label}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="py-2 px-2">
                        {m.difficulty ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={rankStyle(m.difficulty)}>
                            {m.difficulty}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={isPlayed
                            ? { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                            : { backgroundColor: '#2563eb', color: '#fff' }}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Add / edit standing dialog */}
      {editing && (
        <StandingDialog
          key={editing.team}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          standing={editing}
          teams={teams}
          existingTeamIds={standings.map(s => s.team)}
          onSave={async (values) => {
            if (!id) return
            await upsertStanding({ league: Number(id), ...values })
            setDialogOpen(false)
            refresh()
          }}
        />
      )}

      {/* Delete standing confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort lag ur tabellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {deleteTarget?.team_name ?? 'laget'} ur tabellen? Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDeleteStanding() }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StandingDialog({
  open, onOpenChange, standing, teams, existingTeamIds, onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  standing: Standing
  teams: Team[]
  existingTeamIds: number[]
  onSave: (values: {
    team: number; m: number; w: number; d: number; l: number; gm: number; ga: number; p: number
  }) => Promise<void>
}) {
  const isNew = standing.team === 0
  const [team, setTeam] = useState<number>(standing.team)
  const [m, setM] = useState(String(standing.m))
  const [w, setW] = useState(String(standing.w))
  const [d, setD] = useState(String(standing.d))
  const [l, setL] = useState(String(standing.l))
  const [gm, setGm] = useState(String(standing.gm))
  const [ga, setGa] = useState(String(standing.ga))
  const [p, setP] = useState(String(standing.p))
  const [saving, setSaving] = useState(false)

  const n = (v: string) => {
    const parsed = parseInt(v, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  // Teams available to add (exclude ones already in the table, keep the current one when editing).
  const teamOptions = teams.filter(t => !existingTeamIds.includes(t.id) || t.id === standing.team)

  async function handleSave() {
    if (!team) return
    setSaving(true)
    try {
      await onSave({ team, m: n(m), w: n(w), d: n(d), l: n(l), gm: n(gm), ga: n(ga), p: n(p) })
    } finally {
      setSaving(false)
    }
  }

  const numFields: { label: string; value: string; set: (v: string) => void }[] = [
    { label: 'M', value: m, set: setM },
    { label: 'V', value: w, set: setW },
    { label: 'O', value: d, set: setD },
    { label: 'F', value: l, set: setL },
    { label: 'GM', value: gm, set: setGm },
    { label: 'IM', value: ga, set: setGa },
    { label: 'P', value: p, set: setP },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Lägg till lag' : `Redigera ${standing.team_name ?? 'lag'}`}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Lag</Label>
            {isNew ? (
              <Select value={team ? String(team) : ''} onValueChange={(v) => setTeam(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj lag" />
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.team ?? '–'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium text-foreground">{standing.team_name ?? '–'}</p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {numFields.map(f => (
              <div key={f.label} className="flex flex-col gap-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="text-center"
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !team}
            style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
          >
            {saving ? 'Sparar…' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
