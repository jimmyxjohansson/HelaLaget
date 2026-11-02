'use client'

import { useRouter } from '../lib/nav'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowRightLeft, ArrowUp, ChevronDown, List, Loader2, RotateCcw, Users, Wand2, X } from 'lucide-react'
import { useGetTrainingGroups, useUpdateGroupRank, useUpdateParticipantGroups } from '../hooks/backend/trainings'
import { Button } from '../lib/shadcn/button'
import { Checkbox } from '../lib/shadcn/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../lib/shadcn/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../lib/shadcn/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '../lib/shadcn/tabs'
import { trainingTypeColor } from '../utils/trainingTypeColor'
import GenderBadge from '../components/GenderBadge'
import { isMixed } from '../utils/gender'
import GroupDialog from './ui/GroupDialog'
import { GROUP_DEFAULT_RANK, TRAINING_GROUPS, groupShort, groupTab } from '../utils/trainingGroups'
import type { GroupResult } from '../utils/groups'
import { rankStyle } from '../utils/rankColors'
import { cn } from '../lib/shadcn/utils'

const RANK_OPTIONS = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X'] as const

const RANK_ORDER: Record<string, number> = {
  A: 0, AB: 1, B: 2, BC: 3, C: 4, CD: 5, D: 6, X: 7,
}

type SortBy = 'name' | 'rank'
type SortDir = 'asc' | 'desc'

interface Participant {
  player_id: number
  firstname: string
  lastname: string
  shortname: string
  number: number | null
  img: string | null
  rank: string | null
  status: string
  group_name: string | null
  grouprank: string | null
  goalkeeper?: boolean
  gender?: string | null
}

interface TrainingInfo {
  id: number
  type: string
  date: string
  indooroutdoor: string
}

interface GroupsData {
  training: TrainingInfo | null
  participants: Participant[]
}

const GROUPS = TRAINING_GROUPS
const UNASSIGNED_KEY = '__unassigned__'

const VISIBLE_STATUSES = new Set(['Närvarande', 'Kallad', 'Anmäld'])

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

export default function TrainingGroups() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, loading, trigger } = useGetTrainingGroups()
  const { trigger: triggerUpdate, loading: saving } = useUpdateParticipantGroups()
  const { trigger: triggerGroupRank, loading: savingRank } = useUpdateGroupRank()

  const [activeTab, setActiveTab] = useState<string>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)

  useEffect(() => {
    if (id) trigger({ trainingId: Number(id) })
  }, [id])

  const result = data as unknown as GroupsData | undefined
  const training = result?.training ?? null
  const participants = (result?.participants ?? []).filter(p => VISIBLE_STATUSES.has(p.status))
  const mixed = isMixed(participants)

  // Bucket participants by group
  const buckets = useMemo(() => {
    const map: Record<string, Participant[]> = { [UNASSIGNED_KEY]: [] }
    GROUPS.forEach(g => { map[g] = [] })
    for (const p of participants) {
      const key = p.group_name && GROUPS.includes(p.group_name as typeof GROUPS[number])
        ? p.group_name
        : UNASSIGNED_KEY
      const arr = map[key]
      if (arr) arr.push(p)
    }
    const dirMul = sortDir === 'asc' ? 1 : -1
    const cmp = (a: Participant, b: Participant) => {
      if (sortBy === 'rank') {
        const ra = a.rank ? RANK_ORDER[a.rank.toUpperCase()] ?? 99 : 99
        const rb = b.rank ? RANK_ORDER[b.rank.toUpperCase()] ?? 99 : 99
        if (ra !== rb) return (ra - rb) * dirMul
        return a.firstname.localeCompare(b.firstname, 'sv')
      }
      return a.firstname.localeCompare(b.firstname, 'sv') * dirMul
    }
    for (const key of Object.keys(map)) {
      map[key]?.sort(cmp)
    }
    return map
  }, [participants, sortBy, sortDir])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    GROUPS.forEach(g => { c[g] = buckets[g]?.length ?? 0 })
    c[UNASSIGNED_KEY] = buckets[UNASSIGNED_KEY]?.length ?? 0
    return c
  }, [buckets])

  function toggleSort(by: SortBy) {
    if (sortBy === by) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(by)
      setSortDir('asc')
    }
  }

  function toggleSelect(playerId: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function moveSelectedTo(group: string | null) {
    if (!id || selected.size === 0) return
    const playerIds = Array.from(selected)
    const grouprank = group ? GROUP_DEFAULT_RANK[group] ?? null : null
    await triggerUpdate({ trainingId: Number(id), playerIds, group, grouprank })
    clearSelection()
    trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  async function moveOneTo(playerId: number, group: string | null) {
    if (!id) return
    const grouprank = group ? GROUP_DEFAULT_RANK[group] ?? null : null
    await triggerUpdate({ trainingId: Number(id), playerIds: [playerId], group, grouprank })
    trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  async function setGroupRank(group: string, rank: string | null) {
    if (!id) return
    await triggerGroupRank({ trainingId: Number(id), group, rank })
    trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  async function saveGroups(groups: GroupResult, clearIds: number[]) {
    if (!id) return
    const trainingId = Number(id)
    // Först bort ur grupperna för dem som inte är med, sedan de nya grupperna
    const assigned = new Set(groups.flatMap((g) => g.playerIds))
    const toClear = clearIds.filter((pid) => !assigned.has(pid))
    if (toClear.length) await triggerUpdate({ trainingId, playerIds: toClear, group: null, grouprank: null })
    await Promise.all(groups.map((g) => triggerUpdate({ trainingId, playerIds: g.playerIds, group: g.name, grouprank: g.grouprank })))
    clearSelection()
    trigger({ trainingId }, { skipCache: true })
  }

  async function resetAllGroups() {
    if (!id) return
    const playerIds = participants.filter((p) => p.group_name).map((p) => p.player_id)
    if (playerIds.length === 0) return
    if (!window.confirm(`Ta bort alla ${playerIds.length} spelare ur sina grupper?`)) return
    const trainingId = Number(id)
    await triggerUpdate({ trainingId, playerIds, group: null, grouprank: null })
    clearSelection()
    setActiveTab('all')
    trigger({ trainingId }, { skipCache: true })
  }

  // Determine which sections to render based on tab
  const visibleSections: { key: string; label: string }[] = useMemo(() => {
    if (activeTab === 'all') {
      return [
        ...GROUPS.filter(g => (counts[g] ?? 0) > 0).map(g => ({ key: g, label: g })),
        ...((counts[UNASSIGNED_KEY] ?? 0) > 0
          ? [{ key: UNASSIGNED_KEY, label: 'Ej tilldelade' }]
          : []),
      ]
    }
    if (activeTab === UNASSIGNED_KEY) {
      return [{ key: UNASSIGNED_KEY, label: 'Ej tilldelade' }]
    }
    return [{ key: activeTab, label: activeTab }]
  }, [activeTab, counts])

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-4" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-team-accent/80 text-sm hover:text-team-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tillbaka
          </button>
          <button
            onClick={() => setOverviewOpen(true)}
            className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
            aria-label="Gruppöversikt"
            title="Gruppöversikt"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
        {training ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold text-white px-2 py-0.5 rounded-full"
                style={{ backgroundColor: trainingTypeColor(training.type) }}
              >
                {training.type}
              </span>
              <span className="text-xs text-team-accent/70">
                {formatDate(training.date)} · {formatTime(training.date)}
              </span>
            </div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5" /> Grupper
            </h1>
          </>
        ) : (
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" /> Grupper
          </h1>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-2 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto flex justify-start h-auto p-1 gap-1">
            <TabsTrigger value="all" className="text-xs px-2.5 py-1.5">
              Alla ({participants.length})
            </TabsTrigger>
            {GROUPS.filter(g => (counts[g] ?? 0) > 0).map(g => (
              <TabsTrigger key={g} value={g} className="text-xs px-2.5 py-1.5 whitespace-nowrap">
                {groupTab(g)} ({counts[g] ?? 0})
              </TabsTrigger>
            ))}
            {(counts[UNASSIGNED_KEY] ?? 0) > 0 && (
              <TabsTrigger value={UNASSIGNED_KEY} className="text-xs px-2.5 py-1.5 whitespace-nowrap">
                Ingen ({counts[UNASSIGNED_KEY] ?? 0})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Auto-assign toolbar */}
      <div className="px-4 pt-3 pb-1 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={saving || loading || participants.length === 0}
          onClick={() => setGroupDialogOpen(true)}
          className="flex-1 h-9 gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Dela in i grupper
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={saving || loading || !participants.some((p) => p.group_name)}
          onClick={resetAllGroups}
          className="h-9 gap-1.5"
          title="Ta bort alla spelare ur sina grupper"
        >
          <RotateCcw className="w-4 h-4" />
          Nollställ alla grupper
        </Button>
        <GroupDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          participants={participants}
          onSave={saveGroups}
        />
      </div>

      {/* Sort toolbar */}
      <div className="px-4 pt-2 pb-0 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sortera:</span>
        <button
          onClick={() => toggleSort('name')}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs border transition-colors',
            sortBy === 'name'
              ? 'bg-muted border-border text-foreground'
              : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Namn
          {sortBy === 'name' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
        </button>
        <button
          onClick={() => toggleSort('rank')}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs border transition-colors',
            sortBy === 'rank'
              ? 'bg-muted border-border text-foreground'
              : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Rank
          {sortBy === 'rank' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 space-y-5 pb-32">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            Inga deltagare inbjudna till denna träning.
          </div>
        ) : (
          visibleSections.map(section => {
            const list = buckets[section.key] ?? []
            const isGroup = section.key !== UNASSIGNED_KEY
            const ranks = new Set(list.map(p => p.grouprank).filter(Boolean) as string[])
            const sharedRank = ranks.size === 1 ? [...ranks][0]! : null
            return (
              <div key={section.key}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label} ({list.length})
                  </h2>
                  {isGroup && list.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={saving || savingRank}
                          className={cn(
                            'inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-bold border border-border transition-colors',
                            'hover:bg-muted disabled:opacity-50',
                          )}
                          style={sharedRank ? rankStyle(sharedRank) : undefined}
                          aria-label={`Sätt rank för ${section.label}`}
                        >
                          <span>Rank: {sharedRank ?? (ranks.size > 1 ? 'Blandad' : '–')}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[8rem]">
                        {RANK_OPTIONS.map(r => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => setGroupRank(section.key, r)}
                            className="gap-2"
                          >
                            <span
                              className="inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold"
                              style={rankStyle(r)}
                            >
                              {r}
                            </span>
                            <span className="text-xs">{r}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          onClick={() => setGroupRank(section.key, null)}
                          className="gap-2 text-muted-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="text-xs">Ta bort rank</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {list.length === 0 ? (
                  <div className="text-xs text-muted-foreground/70 italic px-3 py-3 border border-dashed border-border rounded-lg">
                    Inga spelare i denna grupp
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl divide-y divide-border">
                    {list.map(p => (
                      <ParticipantRow
                        key={p.player_id}
                        participant={p}
                        selected={selected.has(p.player_id)}
                        onToggleSelect={() => toggleSelect(p.player_id)}
                        onMoveTo={(g) => moveOneTo(p.player_id, g)}
                        disabled={saving || savingRank}
                        mixed={mixed}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 z-20">
          <div className="bg-card border border-border rounded-xl shadow-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selected.size} {selected.size === 1 ? 'vald' : 'valda'}
              </span>
              <button
                onClick={clearSelection}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Rensa val"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" /> Flytta till:
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {GROUPS.map(g => (
                <Button
                  key={g}
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => moveSelectedTo(g)}
                  className="h-9 px-0 text-xs font-semibold"
                >
                  {groupShort(g)}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => moveSelectedTo(null)}
                className="h-9 px-0 text-xs"
                aria-label="Ta bort gruppindelning"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            {saving && (
              <div className="flex items-center justify-center text-xs text-muted-foreground gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Sparar…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Condensed group overview */}
      <Dialog open={overviewOpen} onOpenChange={setOverviewOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Gruppöversikt</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-1 max-h-[70vh] overflow-y-auto">
            {participants.length === 0 ? (
              <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Inga deltagare.</p>
            ) : (
              <>
                {[
                  ...GROUPS.filter(g => (counts[g] ?? 0) > 0).map(g => ({ key: g, label: g })),
                  ...((counts[UNASSIGNED_KEY] ?? 0) > 0 ? [{ key: UNASSIGNED_KEY, label: 'Ej tilldelade' }] : []),
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{label}</span>
                      <span className="text-[10px] text-muted-foreground">({counts[key] ?? 0})</span>
                    </div>
                    <ul className="flex flex-col">
                      {(buckets[key] ?? []).map(p => (
                        <li key={p.player_id} className="flex items-center gap-2 py-0.5 border-b border-border/50 last:border-0">
                          <span className="text-xs text-foreground w-20 truncate">{p.shortname}</span>
                          {p.rank ? (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0" style={rankStyle(p.rank)}>
                              {p.rank}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">–</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface RowProps {
  participant: Participant
  selected: boolean
  onToggleSelect: () => void
  onMoveTo: (group: string | null) => void
  disabled: boolean
  mixed?: boolean
}

function ParticipantRow({ participant, selected, onToggleSelect, onMoveTo, disabled, mixed }: RowProps) {
  const p = participant
  const statusLow = p.status?.toLowerCase() ?? ''
  const isKallad = statusLow.includes('kallad')

  return (
    <div className={cn('flex items-center gap-2.5 px-3 py-2.5', isKallad && 'bg-muted/100')}>
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        className="flex-shrink-0"
        aria-label={`Välj ${p.shortname}`}
        disabled={disabled}
      />
      {/* Rank chip */}
      <span
        className="inline-flex items-center justify-center w-8 h-7 rounded-md text-[11px] font-bold shrink-0"
        style={p.rank ? rankStyle(p.rank) : { backgroundColor: '#B7B7B7', color: '#fff' }}
        title={`Rank: ${p.rank ?? '—'}`}
      >
        {p.rank ?? '–'}
      </span>
      <button
        onClick={onToggleSelect}
        className="flex flex-col min-w-0 flex-1 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="truncate">{p.shortname}</span>
          {mixed && <GenderBadge gender={p.gender} />}
        </span>
      </button>
      {/* Grupp per rad: en lista i stället för nio knappar, så att raden får plats i mobilen */}
      <select
        value={p.group_name && GROUPS.includes(p.group_name as typeof GROUPS[number]) ? p.group_name : ''}
        onChange={(e) => onMoveTo(e.target.value || null)}
        disabled={disabled}
        aria-label={`Grupp för ${p.shortname}`}
        style={p.group_name && p.grouprank ? rankStyle(p.grouprank) : undefined}
        className={cn(
          'h-7 shrink-0 rounded-md border px-1.5 text-xs font-semibold',
          p.group_name
            ? p.grouprank ? 'border-transparent' : 'bg-primary text-primary-foreground border-primary'
            : 'bg-background border-border text-muted-foreground',
        )}
      >
        <option value="">Ingen</option>
        {GROUPS.map(g => (
          <option key={g} value={g}>{g === 'Målvakter' ? 'Målvakter' : groupTab(g)}</option>
        ))}
      </select>
    </div>
  )
}
