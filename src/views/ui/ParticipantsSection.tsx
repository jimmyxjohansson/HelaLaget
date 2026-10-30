'use client'

import { useState } from 'react'
import {
  Trash2,
  X,
  UserPlus,
  Search,
  ChevronDown,
  ChevronsUpDown,
  CheckCircle,
  UserCheck,
  XCircle,
  Clock,
  Lightbulb,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown as SortIcon,
  MessageSquare,
  Ban,
} from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Checkbox } from '../../lib/shadcn/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../lib/shadcn/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../lib/shadcn/sheet'
import { VisualCheckbox } from '../../components/VisualCheckbox'
import { rankStyle } from '../../utils/rankColors'

export interface ParticipantRow {
  id: number
  player: number | null
  status: string
  position: string | null
  shortname: string | null
  firstname: string | null
  lastname: string | null
  img: string | null
  number: number | null
  rank: string | null
  reason: string | null
}

type SortField = 'name' | 'rank'
type SortDir = 'asc' | 'desc'

export interface PlayerOption {
  id: number
  shortname: string | null
  firstname: string
  lastname: string
  img: string | null
  status?: string
}

const STATUS_CONFIG: Record<string, { label: string; hex: string; icon: typeof CheckCircle }> = {
  Förslag:     { label: 'Förslag',     hex: '#F59E0B', icon: Lightbulb },
  Kommer:      { label: 'Kommer',      hex: '#008000', icon: CheckCircle },
  Inbjuden:    { label: 'Inbjuden',    hex: '#0000FF', icon: UserCheck },
  Reserv:      { label: 'Reserv',      hex: '#9333EA', icon: Clock },
  'Ej svarat': { label: 'Ej svarat',   hex: '#9CA3AF', icon: HelpCircle },
  Nekat:       { label: 'Nekat',       hex: '#FF0000', icon: XCircle },
}

const STATUS_ORDER = ['Förslag', 'Inbjuden', 'Kommer', 'Nekat', 'Ej svarat', 'Reserv']
const PLAYER_STATUS_FILTERS = ['Aktiv', 'Gästspelare', 'Vilande', 'Slutat'] as const

interface Props {
  participants: ParticipantRow[]
  allPlayers: PlayerOption[]
  onChanged: () => void
  /** Add players with the given status. */
  onAdd: (playerIds: number[], status: string) => Promise<void>
  /** Remove the given players. */
  onRemove: (playerIds: number[]) => Promise<void>
  /** Update the status of the given players. */
  onUpdateStatus: (playerIds: number[], status: string) => Promise<void>
  /** Update a single participant's reason (keyed by participant row id). */
  onUpdateReason: (participantId: number, reason: string | null) => Promise<void>
  adding?: boolean
  removing?: boolean
  updating?: boolean
  savingReason?: boolean
  /** Noun used in the add button label + remove tooltip. Defaults to "matchen". */
  removeTarget?: string
}

export default function ParticipantsSection({
  participants,
  allPlayers,
  onChanged,
  onAdd,
  onRemove,
  onUpdateStatus,
  onUpdateReason,
  adding: addingBulk = false,
  removing = false,
  updating = false,
  savingReason = false,
  removeTarget = 'matchen',
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function sortRows(rows: ParticipantRow[]) {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortField === 'rank') {
        // Nulls always last regardless of direction
        const ra = a.rank ?? ''
        const rb = b.rank ?? ''
        if (!ra && !rb) return 0
        if (!ra) return 1
        if (!rb) return -1
        const cmp = ra.localeCompare(rb, 'sv')
        if (cmp !== 0) return cmp * dir
      }
      const na = a.shortname ?? `${a.firstname ?? ''} ${a.lastname ?? ''}`.trim()
      const nb = b.shortname ?? `${b.firstname ?? ''} ${b.lastname ?? ''}`.trim()
      return na.localeCompare(nb, 'sv') * dir
    })
  }

  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addSelected, setAddSelected] = useState<Set<number>>(new Set())
  const [playerStatusFilter, setPlayerStatusFilter] = useState<Set<string>>(new Set(['Aktiv']))

  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonTarget, setReasonTarget] = useState<{ id: number; name: string } | null>(null)
  const [reasonText, setReasonText] = useState('')

  function openReasonDialog(p: ParticipantRow) {
    setReasonTarget({
      id: p.id,
      name: p.shortname ?? `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim(),
    })
    setReasonText(p.reason ?? '')
    setReasonOpen(true)
  }

  async function saveReason() {
    if (!reasonTarget) return
    await onUpdateReason(reasonTarget.id, reasonText || null)
    setReasonOpen(false)
    onChanged()
  }

  const usedPlayerIds = new Set(
    participants.map(p => p.player).filter((v): v is number => v != null),
  )
  const availablePlayers = allPlayers.filter(p => !usedPlayerIds.has(p.id))

  // Group participants by status (keyed by player id for bulk ops)
  const grouped: Record<string, ParticipantRow[]> = {}
  for (const p of participants) {
    const key = p.status ?? 'Ej svarat'
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(p)
  }
  const orderedGroups = STATUS_ORDER
    .filter(s => grouped[s] && grouped[s]!.length > 0)
    .concat(Object.keys(grouped).filter(k => !STATUS_ORDER.includes(k)))

  function playerIdsOf(rows: ParticipantRow[]) {
    return rows.map(r => r.player).filter((v): v is number => v != null)
  }

  function togglePlayer(playerId: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function toggleGroup(playerIds: number[]) {
    const allSelected = playerIds.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) playerIds.forEach(id => next.delete(id))
      else playerIds.forEach(id => next.add(id))
      return next
    })
  }

  function toggleCollapsed(key: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function applyStatus(status: string) {
    if (selected.size === 0) return
    await onUpdateStatus(Array.from(selected), status)
    clearSelection()
    onChanged()
  }

  async function handleRemoveSelected() {
    if (selected.size === 0) return
    await onRemove(Array.from(selected))
    clearSelection()
    onChanged()
  }

  function openAddSheet() {
    setAddSearch('')
    setAddSelected(new Set())
    setAddOpen(true)
  }

  async function handleAddWithStatus(status: string) {
    if (addSelected.size === 0) return
    await onAdd(Array.from(addSelected), status)
    setAddSelected(new Set())
    onChanged()
  }

  // Summary counts
  const count = (s: string) => grouped[s]?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {(['Kommer', 'Inbjuden', 'Reserv', 'Nekat'] as const).map(s => (
          <div
            key={s}
            className="rounded-xl p-3 flex flex-col items-center justify-center"
            style={{ backgroundColor: STATUS_CONFIG[s]?.hex }}
          >
            <span className="text-xl font-bold text-white leading-none">{count(s)}</span>
            <span className="text-[10px] font-medium text-white/80 mt-1">{s}</span>
          </div>
        ))}
      </div>

      {orderedGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-center text-muted-foreground text-sm">Inga deltagare ännu</p>
          <button
            onClick={openAddSheet}
            className="flex items-center gap-1.5 text-sm text-primary font-medium"
          >
            <UserPlus className="w-4 h-4" /> Lägg till deltagare
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Deltagare
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const allCollapsed = orderedGroups.every(k => collapsedGroups.has(k))
                  setCollapsedGroups(prev => {
                    const next = new Set(prev)
                    if (allCollapsed) orderedGroups.forEach(k => next.delete(k))
                    else orderedGroups.forEach(k => next.add(k))
                    return next
                  })
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                {orderedGroups.every(k => collapsedGroups.has(k)) ? 'Expandera' : 'Komprimera'}
              </button>
              <button
                onClick={openAddSheet}
                className="flex items-center gap-1 text-xs text-primary font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" /> Lägg till
              </button>
            </div>
          </div>

          {orderedGroups.map(statusKey => {
            const group = grouped[statusKey] ?? []
            const cfg = STATUS_CONFIG[statusKey]
            const Icon = cfg?.icon ?? UserCheck
            const hex = cfg?.hex ?? '#888888'
            const label = cfg?.label ?? statusKey
            const groupIds = playerIdsOf(group)
            const allGroupSelected = groupIds.length > 0 && groupIds.every(id => selected.has(id))
            const someGroupSelected = groupIds.some(id => selected.has(id))
            const isCollapsed = collapsedGroups.has(statusKey)
            return (
              <div key={statusKey}>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={allGroupSelected ? true : someGroupSelected ? 'indeterminate' : false}
                    onCheckedChange={() => toggleGroup(groupIds)}
                    className="w-4 h-4"
                    aria-label={`Välj alla ${label}`}
                  />
                  <button
                    onClick={() => toggleCollapsed(statusKey)}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider flex-1 text-left"
                    style={{ color: hex }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label} ({group.length})
                    <ChevronDown
                      className={`w-3.5 h-3.5 ml-auto transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="bg-card border border-border rounded-xl divide-y divide-border">
                    {/* Sortable column header */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-muted/40">
                      {/* checkbox spacer */}
                      <span className="w-4 h-4 flex-shrink-0" />
                      {/* avatar spacer */}
                      <span className="w-8 h-8 flex-shrink-0" />
                      <button
                        onClick={() => toggleSort('name')}
                        className="flex items-center gap-1 flex-1 min-w-0 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Namn
                        <SortIndicator active={sortField === 'name'} dir={sortDir} />
                      </button>
                      <button
                        onClick={() => toggleSort('rank')}
                        className="flex items-center gap-1 w-14 justify-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Rank
                        <SortIndicator active={sortField === 'rank'} dir={sortDir} />
                      </button>
                    </div>
                    {sortRows(group).map(p => {
                      const pid = p.player
                      const isSelected = pid != null && selected.has(pid)
                      return (
                        <div
                          key={p.id}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                          style={{ backgroundColor: !isSelected ? hex + '10' : undefined }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => pid != null && togglePlayer(pid)}
                            className="flex-shrink-0"
                            aria-label={`Välj ${p.shortname}`}
                          />
                          <button
                            onClick={() => pid != null && togglePlayer(pid)}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                              {p.img ? (
                                <img
                                  src={p.img}
                                  alt={p.shortname ?? ''}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-medium text-foreground truncate">
                                {p.shortname ??
                                  (`${p.firstname ?? ''} ${p.lastname ?? ''}`.trim() || '–')}
                              </span>
                              {p.reason ? (
                                <span className="text-xs text-muted-foreground truncate">
                                  {p.reason}
                                </span>
                              ) : p.position ? (
                                <span className="text-xs text-muted-foreground truncate">
                                  {p.position}
                                </span>
                              ) : null}
                            </div>
                            <span className="w-14 flex justify-end flex-shrink-0">
                              {p.rank ? (
                                <span
                                  className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-xs font-bold"
                                  style={rankStyle(p.rank)}
                                >
                                  {p.rank}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">–</span>
                              )}
                            </span>
                          </button>
                          <button
                            onClick={() => openReasonDialog(p)}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                            aria-label={`Ange anledning för ${p.shortname}`}
                            title="Ange anledning"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Spacer so action bar doesn't cover the last row */}
      {selected.size > 0 && <div className="h-16" />}

      {/* Sticky action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 max-w-[430px] mx-auto px-4 pb-3 pt-2">
          <div className="bg-card border border-border rounded-xl shadow-lg p-3 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground shrink-0">
              {selected.size} vald{selected.size !== 1 ? 'a' : ''}
            </span>
            <div className="flex-1 min-w-0 flex items-center gap-1.5 justify-center">
              {STATUS_ORDER.map(value => {
                const cfg = STATUS_CONFIG[value]
                if (!cfg) return null
                const Icon = cfg.icon
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => applyStatus(value)}
                    disabled={updating}
                    aria-label={cfg.label}
                    title={cfg.label}
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all opacity-90 hover:opacity-100 hover:scale-105 disabled:opacity-50"
                    style={{ backgroundColor: cfg.hex }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleRemoveSelected}
              disabled={removing}
              className="shrink-0 text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
              aria-label="Ta bort valda"
              title={`Ta bort från ${removeTarget}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={clearSelection}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Avmarkera alla"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add participant sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col px-0 pb-0">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle>Lägg till deltagare</SheetTitle>
          </SheetHeader>
          <div className="px-4 py-2 border-b border-border">
            <div className="flex gap-2 flex-wrap">
              {PLAYER_STATUS_FILTERS.map(s => {
                const on = playerStatusFilter.has(s)
                return (
                  <button
                    key={s}
                    onClick={() => setPlayerStatusFilter(prev => {
                      const next = new Set(prev)
                      if (next.has(s)) next.delete(s)
                      else next.add(s)
                      return next
                    })}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="px-4 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Sök spelare…"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {(() => {
              const filtered = availablePlayers.filter(p => {
                const name = p.shortname ?? `${p.firstname} ${p.lastname}`.trim()
                if (addSearch && !name.toLowerCase().includes(addSearch.toLowerCase())) return false
                if (playerStatusFilter.size > 0 && (!p.status || !playerStatusFilter.has(p.status))) return false
                return true
              })
              const allSelected = filtered.length > 0 && filtered.every(p => addSelected.has(p.id))
              if (filtered.length === 0) {
                return (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Inga tillgängliga spelare
                  </p>
                )
              }
              return (
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  <button
                    onClick={() =>
                      setAddSelected(prev => {
                        const next = new Set(prev)
                        if (allSelected) filtered.forEach(p => next.delete(p.id))
                        else filtered.forEach(p => next.add(p.id))
                        return next
                      })
                    }
                    disabled={addingBulk}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                      allSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <VisualCheckbox checked={allSelected} />
                    <span className="text-sm font-semibold text-foreground">Markera alla</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {filtered.length} spelare
                    </span>
                  </button>
                  {filtered.map(p => {
                    const isSelected = addSelected.has(p.id)
                    const name = p.shortname ?? `${p.firstname} ${p.lastname}`.trim()
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          setAddSelected(prev => {
                            const next = new Set(prev)
                            if (next.has(p.id)) next.delete(p.id)
                            else next.add(p.id)
                            return next
                          })
                        }
                        disabled={addingBulk}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <VisualCheckbox checked={isSelected} />
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                          {p.img ? (
                            <img src={p.img} alt={name} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <span className="text-sm font-medium text-foreground">{name}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {addSelected.size > 0 && (
            <div className="px-4 py-3 border-t border-border bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {addSelected.size} vald{addSelected.size !== 1 ? 'a' : ''}
                </span>
                <span className="text-xs text-muted-foreground">Välj status för att lägga till</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {STATUS_ORDER.map(value => {
                  const cfg = STATUS_CONFIG[value]
                  if (!cfg) return null
                  const Icon = cfg.icon
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleAddWithStatus(value)}
                      disabled={addingBulk}
                      aria-label={`Lägg till som ${cfg.label}`}
                      title={cfg.label}
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all opacity-90 hover:opacity-100 hover:scale-105 disabled:opacity-50"
                      style={{ backgroundColor: cfg.hex }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reason dialog */}
      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anledning – {reasonTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Anledning</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reasonText}
                  onChange={e => setReasonText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !savingReason) { e.preventDefault(); saveReason() } }}
                  placeholder="t.ex. Sjuk"
                  className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setReasonText('Ingen anledning')}
                  className="shrink-0 p-2 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  title="Ingen anledning"
                  aria-label="Fyll i Ingen anledning"
                >
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReasonOpen(false)} disabled={savingReason}>
              Avbryt
            </Button>
            <Button
              onClick={saveReason}
              disabled={savingReason}
              style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
            >
              {savingReason ? 'Sparar…' : 'Spara'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <SortIcon className="w-3 h-3 opacity-40" />
  return dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}
