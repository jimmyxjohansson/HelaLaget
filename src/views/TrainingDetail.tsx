'use client'

import SyncRepliesButton, { SyncStatusLine, type SyncStatus } from './svar/SyncRepliesButton'
import { useRouter } from '../lib/nav'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGetTrainingDetail, useUpdateAttendanceStatus, useDeleteTraining, useUpdateLeaderStatus, useGetAvailableLeaders, useAddLeaders, useRemoveLeader } from '../hooks/backend/trainings'
import { ArrowLeft, MapPin, Pencil, X, Copy, UserPlus, Search, Trash2, ChevronDown, ChevronsUpDown, MoreVertical, CheckCircle, UserCheck, XCircle, Clock, ClipboardCheck, ClipboardX, MessageSquare, Ban, Users, ExternalLink, ClipboardList, ChevronRight } from 'lucide-react'
import { trainingTypeColor } from '../utils/trainingTypeColor'
import { Button } from '../lib/shadcn/button'
import { Checkbox } from '../lib/shadcn/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../lib/shadcn/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../lib/shadcn/dropdown-menu'
import { useCopyTraining, useGetAvailablePlayers, useAddParticipants, useRemoveParticipant, useMarkAsReported, useUpdateParticipantReason, useUpdateLeaderReason, useUpdateParticipantGroups } from '../hooks/backend/trainings'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../lib/shadcn/sheet'
import { AttendanceStatsButton } from '../components/AttendanceStatsButton'
import { VisualCheckbox } from '../components/VisualCheckbox'
import TrainingForm from './ui/TrainingForm'
import { canEdit } from '../lib/squad-store'
import { useGetTrainingPlan } from '../hooks/backend/plans'
import DatePicker from '../components/DatePicker'
import TimeInput from '../components/TimeInput'
import { GROUP_DEFAULT_RANK, TRAINING_GROUPS, groupShort } from '../utils/trainingGroups'
import { useSquadStatuses } from '../hooks/useSquadStatuses'

interface Attendee {
  player_id: number
  firstname: string
  lastname: string
  shortname: string
  number: number
  img: string
  status: string
  reason: string | null
  reasontime: string | null
  group_name: string | null
  comment: string | null
}

interface TrainingInfo {
  id: number
  type: string
  date1: string
  date: string
  indooroutdoor: string
  notes: string | null
  svenskalag: string | null
  reported: boolean
  present_count: string
  total_registered: string
}

interface Leader {
  leader_id: number
  shortname: string
  firstname: string
  lastname: string
  status: string
  reason: string | null
  reasontime: string | null
}

interface TrainingDetailData {
  training: TrainingInfo | null
  attendees: Attendee[]
  leaders: Leader[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('sv-SE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  })
}

const STATUS_CONFIG: Record<string, { label: string; hex: string; icon: typeof CheckCircle }> = {
  'Närvarande':      { label: 'Närvarande',      hex: '#008000', icon: CheckCircle },
  'Närvarande, ej hela':      { label: 'Närvarande, ej hela',      hex: '#008000', icon: CheckCircle },
  'Anmäld':         { label: 'Anmäld',           hex: '#0000FF', icon: UserCheck },
  'Kallad':         { label: 'Kallad',            hex: '#9333ea', icon: UserCheck },
  'Ej närvarande':  { label: 'Ej närvarande',     hex: '#FF0000', icon: XCircle },
  'Anmäld, kom ej': { label: 'Anmäld – kom ej',  hex: '#FFA500', icon: XCircle },
  'Annan aktivitet':{ label: 'Annan aktivitet',   hex: '#69A969', icon: Clock },
}

const STATUS_ORDER = ['Kallad', 'Anmäld', 'Närvarande', 'Närvarande, ej hela', 'Ej närvarande', 'Anmäld, kom ej', 'Annan aktivitet']

// Row background: 50% opacity of the status color, or light gray for
// "Ej närvarande" rows that are missing both reason and reason time.
function rowBgColor(
  statusKey: string,
  reason: string | null | undefined,
  reasontime: string | null | undefined,
): string | undefined {
  if (statusKey === 'Ej närvarande' && !reason && !reasontime) {
    return '#9CA3AF80'
  }
  const hex = STATUS_CONFIG[statusKey]?.hex
  return hex ? hex + '10' : undefined
}
const REASON_GROUPS = TRAINING_GROUPS
const REASON_GROUP_DEFAULT_RANK = GROUP_DEFAULT_RANK

export default function TrainingDetail() {
  // Spelare och Anhörig ser träningen men ändrar inget
  const editor = canEdit()
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, loading, trigger } = useGetTrainingDetail()
  const plan = useGetTrainingPlan()
  useEffect(() => {
    if (id) plan.trigger({ trainingId: Number(id) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  const { trigger: triggerUpdate, loading: updating } = useUpdateAttendanceStatus()
  const [editOpen, setEditOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDatePart, setCopyDatePart] = useState('')
  const [copyTimePart, setCopyTimePart] = useState('')
  const [copyParticipants, setCopyParticipants] = useState(true)
  const [copySvenskalag, setCopySvenskalag] = useState('')
  const { trigger: triggerCopy, loading: copying } = useCopyTraining()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addSelected, setAddSelected] = useState<Set<number>>(new Set())
  const [addingBulk, setAddingBulk] = useState(false)
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(['Aktiv', 'Aktiv, ej matchklar']))
  const statusVisible = useSquadStatuses()
  const { data: availableData, trigger: triggerAvailable } = useGetAvailablePlayers()
  const { trigger: triggerAddBulk } = useAddParticipants()
  const { trigger: triggerRemove, loading: removing } = useRemoveParticipant()
  const { trigger: triggerDelete } = useDeleteTraining()

  // Leader state
  const { trigger: triggerUpdateLeader, loading: updatingLeader } = useUpdateLeaderStatus()
  const { data: availableLeadersData, trigger: triggerAvailableLeaders } = useGetAvailableLeaders()
  const { trigger: triggerAddLeadersBulk } = useAddLeaders()
  const { trigger: triggerRemoveLeader, loading: removingLeader } = useRemoveLeader()
  const [selectedLeaders, setSelectedLeaders] = useState<Set<number>>(new Set())
  const [addLeaderOpen, setAddLeaderOpen] = useState(false)
  const [addLeaderSearch, setAddLeaderSearch] = useState('')
  const [addLeaderSelected, setAddLeaderSelected] = useState<Set<number>>(new Set())
  const [addingLeaderBulk, setAddingLeaderBulk] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { trigger: triggerMarkReported, loading: markingReported } = useMarkAsReported()
  const { trigger: triggerUpdateReason, loading: savingReason } = useUpdateParticipantReason()
  const { trigger: triggerUpdateLeaderReason } = useUpdateLeaderReason()
  const { trigger: triggerUpdateGroups } = useUpdateParticipantGroups()
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false)
  const [reasonPlayer, setReasonPlayer] = useState<{ id: number; name: string; isLeader?: boolean; img?: string | null } | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [reasonTimeText, setReasonTimeText] = useState('')
  const [reasonStatus, setReasonStatus] = useState('')
  const [reasonInitialStatus, setReasonInitialStatus] = useState('')
  const [reasonGroup, setReasonGroup] = useState<string | null>(null)
  const [reasonInitialGroup, setReasonInitialGroup] = useState<string | null>(null)

  // Auto-grow the reason textarea to fit its content (deferred a frame so it
  // measures correctly after the dialog has mounted/laid out).
  useEffect(() => {
    if (!reasonDialogOpen) return
    const raf = requestAnimationFrame(() => {
      const el = reasonInputRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    })
    return () => cancelAnimationFrame(raf)
  }, [reasonText, reasonDialogOpen])
  const reasonInputRef = useRef<HTMLTextAreaElement>(null)

  function openReasonDialog(a: Attendee) {
    setReasonPlayer({ id: a.player_id, name: a.shortname, isLeader: false, img: a.img })
    setReasonText(a.reason ?? '')
    setReasonTimeText(a.reasontime ?? '')
    setReasonStatus(a.status)
    setReasonInitialStatus(a.status)
    setReasonGroup(a.group_name)
    setReasonInitialGroup(a.group_name)
    setReasonDialogOpen(true)
  }

  function openLeaderReasonDialog(l: Leader) {
    setReasonPlayer({ id: l.leader_id, name: l.shortname, isLeader: true, img: null })
    setReasonText(l.reason ?? '')
    setReasonTimeText(l.reasontime ?? '')
    setReasonStatus(l.status)
    setReasonInitialStatus(l.status)
    setReasonGroup(null)
    setReasonInitialGroup(null)
    setReasonDialogOpen(true)
  }

  async function saveReason() {
    if (!id || !reasonPlayer) return
    const statusChanged = reasonStatus !== '' && reasonStatus !== reasonInitialStatus
    if (reasonPlayer.isLeader) {
      if (statusChanged) {
        await triggerUpdateLeader({ trainingId: Number(id), leaderIds: [reasonPlayer.id], status: reasonStatus })
      }
      await triggerUpdateLeaderReason({
        trainingId: Number(id),
        leaderId: reasonPlayer.id,
        reason: reasonText || null,
        reasontime: reasonTimeText || null,
      })
    } else {
      if (statusChanged) {
        await triggerUpdate({ trainingId: Number(id), playerIds: [reasonPlayer.id], status: reasonStatus })
      }
      if (reasonGroup !== reasonInitialGroup) {
        await triggerUpdateGroups({
          trainingId: Number(id),
          playerIds: [reasonPlayer.id],
          group: reasonGroup,
          grouprank: reasonGroup ? REASON_GROUP_DEFAULT_RANK[reasonGroup] ?? null : null,
        })
      }
      await triggerUpdateReason({
        trainingId: Number(id),
        playerId: reasonPlayer.id,
        reason: reasonText || null,
        reasontime: reasonTimeText || null,
      })
    }
    setReasonDialogOpen(false)
    trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set([
    'Kallad', 'Anmäld', 'Närvarande', 'Närvarande, ej hela', 'Ej närvarande', 'Anmäld, kom ej', 'Annan aktivitet',
    'leader-Kallad', 'leader-Anmäld', 'leader-Närvarande', 'leader-Ej närvarande', 'leader-Anmäld, kom ej', 'leader-Annan aktivitet',
  ]))

  // Sifferrutorna högst upp: visa bara statusarna rutan räknar (spelare och ledare ligger i samma sektioner).
  // Samma ruta igen fäller ihop allt.
  const [focusedBox, setFocusedBox] = useState<string | null>(null)
  function focusStatuses(box: string, statuses: string[]) {
    if (focusedBox === box) {
      setFocusedBox(null)
      setCollapsedGroups(new Set(STATUS_ORDER))
      return
    }
    setFocusedBox(box)
    setCollapsedGroups(new Set(STATUS_ORDER.filter(k => !statuses.includes(k))))
  }

  function toggleCollapsed(key: string) {
    setFocusedBox(null)
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    if (id) trigger({ trainingId: Number(id) })
  }, [id])

  function handleSaved() {
    if (id) trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  async function handleMarkReported(reported: boolean) {
    if (!id) return
    await triggerMarkReported({ trainingId: Number(id), reported })
    if (id) trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    await triggerDelete({ trainingId: Number(id) })
    setDeleting(false)
    setDeleteConfirmOpen(false)
    router.back()
  }

  function openCopyDialog() {
    if (!training) return
    // Pre-fill with same time one week later
    const d = new Date(training.date)
    d.setUTCDate(d.getUTCDate() + 7)
    setCopyDatePart(d.toISOString().slice(0, 10))   // YYYY-MM-DD
    setCopyTimePart(d.toISOString().slice(11, 16))   // HH:MM
    setCopyParticipants(true)
    setCopySvenskalag(training.svenskalag ?? '')
    // Defer opening so the dropdown menu finishes closing first; otherwise Radix
    // can leave `pointer-events: none` stuck on <body> and freeze the page.
    setTimeout(() => setCopyOpen(true), 0)
  }

  async function handleCopy() {
    if (!id || !copyDatePart || !copyTimePart) return
    const result = await triggerCopy({
      trainingId: Number(id),
      newDate: `${copyDatePart}T${copyTimePart}`,
      includeParticipants: copyParticipants,
      svenskalag: copySvenskalag || null,
    })
    const typed = result as unknown as { id: number } | undefined
    setCopyOpen(false)
    if (typed?.id) router.push(`/trainings/${typed.id}`)
  }

  const detail = data as unknown as TrainingDetailData | undefined
  const { training, attendees = [], leaders = [] } = detail ?? {}

  const presentCount = attendees.filter(a => a.status === 'Närvarande' ||
    a.status === 'Närvarande, ej hela'
  ).length
  const kalladCount = attendees.filter(a => a.status === 'Kallad').length
  const anmaldCount = attendees.filter(a => a.status === 'Anmäld').length
  const ejNarvarandeCount = attendees.filter(a =>
    a.status === 'Ej närvarande' ||
    a.status === 'Anmäld, kom ej' ||
    a.status === 'Annan aktivitet'
  ).length

  const leaderPresentCount = leaders.filter(l => l.status === 'Närvarande').length
  const leaderKalladCount = leaders.filter(l => l.status === 'Kallad').length
  const leaderAnmaldCount = leaders.filter(l => l.status === 'Anmäld').length
  const leaderEjNarvarandeCount = leaders.filter(l =>
    l.status === 'Ej närvarande' ||
    l.status === 'Anmäld, kom ej' ||
    l.status === 'Annan aktivitet'
  ).length

  function togglePlayer(playerId: number) {
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

  function openAddSheet() {
    setAddSearch('')
    setStatusFilter(new Set(['Aktiv', 'Aktiv, ej matchklar']))
    setAddSelected(new Set())
    setAddOpen(true)
    if (id) triggerAvailable({ trainingId: Number(id) })
  }

  async function handleAddWithStatus(status: string) {
    if (!id || addSelected.size === 0) return
    setAddingBulk(true)
    try {
      await triggerAddBulk({
        trainingId: Number(id),
        playerIds: Array.from(addSelected),
        status,
      })
      setAddSelected(new Set())
      trigger({ trainingId: Number(id) }, { skipCache: true })
      triggerAvailable({ trainingId: Number(id) }, { skipCache: true })
    } finally {
      setAddingBulk(false)
    }
  }

  function toggleLeader(leaderId: number) {
    setSelectedLeaders(prev => {
      const next = new Set(prev)
      if (next.has(leaderId)) next.delete(leaderId)
      else next.add(leaderId)
      return next
    })
  }

  function clearLeaderSelection() {
    setSelectedLeaders(new Set())
  }

  function openAddLeaderSheet() {
    setAddLeaderSearch('')
    setAddLeaderSelected(new Set())
    setAddLeaderOpen(true)
    if (id) triggerAvailableLeaders({ trainingId: Number(id) })
  }

  async function handleAddLeadersWithStatus(status: string) {
    if (!id || addLeaderSelected.size === 0) return
    setAddingLeaderBulk(true)
    try {
      await triggerAddLeadersBulk({
        trainingId: Number(id),
        leaderIds: Array.from(addLeaderSelected),
        status,
      })
      setAddLeaderSelected(new Set())
      trigger({ trainingId: Number(id) }, { skipCache: true })
      triggerAvailableLeaders({ trainingId: Number(id) }, { skipCache: true })
    } finally {
      setAddingLeaderBulk(false)
    }
  }

  // Spelare och ledare i samma lista, sorterade på namn inom varje status
  type Person = {
    kind: 'player' | 'leader'
    id: number
    name: string
    status: string
    reason: string | null
    reasontime: string | null
    comment: string | null
    group: string | null
    attendee?: Attendee
    leader?: Leader
  }
  const people: Person[] = [
    ...attendees.map((a): Person => ({
      kind: 'player', id: a.player_id, name: a.shortname, status: a.status ?? 'Okänd',
      reason: a.reason, reasontime: a.reasontime, comment: a.comment, group: a.group_name, attendee: a,
    })),
    ...leaders.map((l): Person => ({
      kind: 'leader', id: l.leader_id, name: l.shortname, status: l.status ?? 'Okänd',
      reason: l.reason, reasontime: l.reasontime, comment: null, group: null, leader: l,
    })),
  ]
  const peopleGrouped: Record<string, Person[]> = {}
  for (const p of people) (peopleGrouped[p.status] ??= []).push(p)
  for (const list of Object.values(peopleGrouped)) list.sort((x, y) => (x.name ?? '').localeCompare(y.name ?? '', 'sv'))
  const orderedPeopleGroups = STATUS_ORDER
    .filter(s => peopleGrouped[s]?.length)
    .concat(Object.keys(peopleGrouped).filter(k => !STATUS_ORDER.includes(k)))

  const selectedCount = selected.size + selectedLeaders.size
  const isPersonSelected = (p: Person) => (p.kind === 'player' ? selected.has(p.id) : selectedLeaders.has(p.id))
  function togglePerson(p: Person) {
    if (p.kind === 'player') togglePlayer(p.id)
    else toggleLeader(p.id)
  }
  function togglePeopleGroup(group: Person[]) {
    const allSel = group.every(isPersonSelected)
    const players = group.filter(p => p.kind === 'player').map(p => p.id)
    const leaderIds = group.filter(p => p.kind === 'leader').map(p => p.id)
    setSelected(prev => {
      const next = new Set(prev)
      players.forEach(i => (allSel ? next.delete(i) : next.add(i)))
      return next
    })
    setSelectedLeaders(prev => {
      const next = new Set(prev)
      leaderIds.forEach(i => (allSel ? next.delete(i) : next.add(i)))
      return next
    })
  }

  /** Byter status på alla markerade, spelare och ledare. */
  async function applyStatusToSelected(status: string) {
    if (!id || selectedCount === 0) return
    await Promise.all([
      selected.size ? triggerUpdate({ trainingId: Number(id), playerIds: Array.from(selected), status }) : null,
      selectedLeaders.size ? triggerUpdateLeader({ trainingId: Number(id), leaderIds: Array.from(selectedLeaders), status }) : null,
    ])
    clearSelection()
    clearLeaderSelection()
    trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  async function removeSelectedPeople() {
    if (!id || selectedCount === 0) return
    await Promise.all([
      selected.size ? triggerRemove({ trainingId: Number(id), playerIds: Array.from(selected) }) : null,
      selectedLeaders.size ? triggerRemoveLeader({ trainingId: Number(id), leaderIds: Array.from(selectedLeaders) }) : null,
    ])
    clearSelection()
    clearLeaderSelection()
    trigger({ trainingId: Number(id) }, { skipCache: true })
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-team-accent/80 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Tillbaka
          </button>
          {training && editor && (
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
                  aria-label="Fler alternativ"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openCopyDialog} className="flex items-center gap-2">
                  <Copy className="w-4 h-4" /> Kopiera
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeout(() => setEditOpen(true), 0)} className="flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Redigera
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/trainings/${id}/plan`)} className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Träningsplan
                </DropdownMenuItem>
                {training.reported && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleMarkReported(false)}
                      disabled={markingReported}
                      className="flex items-center gap-2"
                    >
                      <ClipboardX className="w-4 h-4" /> Markera ej rapporterad
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setTimeout(() => setDeleteConfirmOpen(true), 0)}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" /> Ta bort
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {!training ? (
          <div className="h-12 animate-pulse bg-primary-foreground/10 rounded-lg" />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: trainingTypeColor(training.type) }}>
                {training.type}
              </span>
              <span className="text-xs text-team-accent/70 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {training.indooroutdoor}
              </span>
            </div>
            <h1 className="text-xl font-bold capitalize">{formatDate(training.date)}</h1>
            <p className="text-team-accent/70 text-sm">{formatTime(training.date)}</p>
            {training.notes && (
              <p className="text-team-accent/60 text-xs mt-1 italic">{training.notes}</p>
            )}
            {/* Vanligaste knapparna: Svenskalag, Statistik, Grupper och Rapportera, alla i samma stil */}
            <div className="flex items-center gap-2 mt-3">
              {training.svenskalag && (
                <a
                  href={training.svenskalag}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
                  aria-label="Öppna i Svenskalag"
                  title="Svenskalag"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
              {training.svenskalag && editor && (
                <SyncRepliesButton
                  url={training.svenskalag}
                  kind={'training'}
                id={training.id}
                onStatus={setSyncStatus}
                onSynced={() => trigger({ trainingId: Number(id) }, { skipCache: true })}
                  className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors disabled:opacity-60"
                />
              )}
              <AttendanceStatsButton />
              {editor && <>
              <button
                onClick={() => router.push(`/trainings/${id}/groups`)}
                className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
                aria-label="Hantera grupper"
                title="Grupper"
              >
                <Users className="w-5 h-5" />
              </button>
              {training.reported ? (
                <button
                  onClick={() => handleMarkReported(false)}
                  disabled={markingReported}
                  className="h-9 px-3 rounded-full bg-primary-foreground/20 flex items-center gap-1.5 text-xs font-medium hover:bg-primary-foreground/30 transition-colors"
                  aria-label="Rapporterad. Tryck för att markera som ej rapporterad"
                  title="Rapporterad – tryck för att ångra"
                >
                  <ClipboardCheck className="w-4 h-4" /> Rapporterad
                </button>
              ) : (
                <button
                  onClick={() => handleMarkReported(true)}
                  disabled={markingReported}
                  className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
                  aria-label="Markera som rapporterad"
                  title="Markera som rapporterad"
                >
                  <ClipboardCheck className="w-5 h-5" />
                </button>
              )}
              </>}
            </div>
            <SyncStatusLine status={syncStatus} onDismiss={() => setSyncStatus(null)} className={`mt-2 w-fit max-w-full rounded-md px-2 py-1 text-xs text-white ${syncStatus?.ok ? 'bg-black/20' : 'bg-black/35'}`} />
          </>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Attendance summary */}
        {training && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { box: 'present', color: '#008000', p: presentCount, l: leaderPresentCount, statuses: ['Närvarande', 'Närvarande, ej hela'], label: 'Närvarande' },
              { box: 'anmald', color: '#0000FF', p: anmaldCount, l: leaderAnmaldCount, statuses: ['Anmäld'], label: 'Anmälda' },
              { box: 'ej', color: '#FF0000', p: ejNarvarandeCount, l: leaderEjNarvarandeCount, statuses: ['Ej närvarande', 'Anmäld, kom ej', 'Annan aktivitet'], label: 'Ej närvarande' },
              { box: 'kallad', color: '#9333ea', p: kalladCount, l: leaderKalladCount, statuses: ['Kallad'], label: 'Kallade' },
            ].map(b => (
              <button
                key={b.box}
                type="button"
                onClick={() => focusStatuses(b.box, b.statuses)}
                className={`rounded-xl p-3 flex items-center justify-center transition-shadow ${focusedBox === b.box ? 'ring-2 ring-offset-2 ring-foreground/60 ring-offset-background' : ''}`}
                style={{ backgroundColor: b.color, opacity: !b.p && !b.l ? 0.35 : undefined }}
                aria-pressed={focusedBox === b.box}
                aria-label={`Visa ${b.label.toLowerCase()}`}
                title={`Visa ${b.label.toLowerCase()}`}
              >
                <span className="text-xl font-bold text-white">{b.p}<span className="text-sm font-semibold opacity-75">+{b.l}</span></span>
              </button>
            ))}
          </div>
        )}

        {/* Träningsplan */}
        {training && plan.data && (plan.data.length > 0 || canEdit()) && (
          <button
            type="button"
            onClick={() => router.push(`/trainings/${id}/plan`)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/50"
          >
            <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Träningsplan</p>
              <p className="truncate text-xs text-muted-foreground">
                {plan.data.length === 0
                  ? 'Ingen plan ännu – planera passet med övningar från övningsbanken'
                  : `${plan.data.reduce((a, b) => a + (b.minutes ?? 0), 0)} min · ${plan.data.map((b) => b.name).join(' · ')}`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        {/* Deltagare: spelare och ledare tillsammans, en sektion per status */}
        {loading && !detail ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-xl h-12 animate-pulse" />
            ))}
          </div>
        ) : orderedPeopleGroups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-center text-muted-foreground text-sm">Inga deltagare inbjudna</p>
            {editor && <div className="flex items-center gap-4">
              <button onClick={openAddSheet} className="flex items-center gap-1.5 text-sm text-primary font-medium">
                <UserPlus className="w-4 h-4" /> Lägg till spelare
              </button>
              <button onClick={openAddLeaderSheet} className="flex items-center gap-1.5 text-sm text-primary font-medium">
                <UserPlus className="w-4 h-4" /> Lägg till ledare
              </button>
            </div>}
          </div>
        ) : (
          <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deltagare</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const allCollapsed = orderedPeopleGroups.every(k => collapsedGroups.has(k))
                  setFocusedBox(null)
                  setCollapsedGroups(prev => {
                    const next = new Set(prev)
                    if (allCollapsed) orderedPeopleGroups.forEach(k => next.delete(k))
                    else orderedPeopleGroups.forEach(k => next.add(k))
                    return next
                  })
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                {orderedPeopleGroups.every(k => collapsedGroups.has(k)) ? 'Expandera' : 'Komprimera'}
              </button>
              {editor && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-primary font-medium">
                    <UserPlus className="w-3.5 h-3.5" /> Lägg till
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTimeout(openAddSheet, 0)}>Spelare</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeout(openAddLeaderSheet, 0)}>Ledare</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
            </div>
          </div>
          {orderedPeopleGroups.map(statusKey => {
            const group = peopleGrouped[statusKey] ?? []
            const cfg = STATUS_CONFIG[statusKey]
            const Icon = cfg?.icon ?? UserCheck
            const hex = cfg?.hex ?? '#888888'
            const label = cfg?.label ?? statusKey
            const allGroupSelected = group.length > 0 && group.every(isPersonSelected)
            const someGroupSelected = group.some(isPersonSelected)
            const isCollapsed = collapsedGroups.has(statusKey)
            return (
              <div key={statusKey}>
                {/* Group header with select-all checkbox */}
                <div className="flex items-center gap-2 mb-2">
                  {editor && <Checkbox
                    checked={allGroupSelected ? true : someGroupSelected ? 'indeterminate' : false}
                    onCheckedChange={() => togglePeopleGroup(group)}
                    className="w-4 h-4"
                    aria-label={`Välj alla ${label}`}
                  />}
                  <button
                    onClick={() => toggleCollapsed(statusKey)}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider flex-1 text-left"
                    style={{ color: hex }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label} ({group.filter(p => p.kind === 'player').length}+{group.filter(p => p.kind === 'leader').length})
                    <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                </div>

                {!isCollapsed && (
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {group.map(person => (
                    <div
                      key={`${person.kind}-${person.id}`}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                      style={{ backgroundColor: rowBgColor(statusKey, person.reason, person.reasontime) }}
                    >
                      {editor && <Checkbox
                        checked={isPersonSelected(person)}
                        onCheckedChange={() => togglePerson(person)}
                        className="flex-shrink-0"
                        aria-label={`Välj ${person.name}`}
                      />}
                      <button
                        onClick={() => editor && togglePerson(person)}
                        className="flex flex-col min-w-0 flex-1 text-left"
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{person.name}</span>
                          {person.kind === 'leader' && (
                            <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Ledare</span>
                          )}
                        </span>
                        {(person.reasontime || person.reason) && (
                          <span className="text-xs text-muted-foreground truncate">
                            {[person.reasontime, person.reason].filter(Boolean).join(' – ')}
                          </span>
                        )}
                        {person.comment && (
                          <span className="text-xs text-muted-foreground/70 truncate italic">{person.comment}</span>
                        )}
                      </button>
                      {person.group && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          {person.group}
                        </span>
                      )}
                      {editor && <button
                        onClick={() => person.kind === 'player' ? openReasonDialog(person.attendee!) : openLeaderReasonDialog(person.leader!)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                        aria-label={`Ange anledning för ${person.name}`}
                        title="Ange anledning"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>}
                    </div>
                  ))}
                </div>
                )}
              </div>
            )
          })}
          </>
        )}

        {/* Bottom spacer so action bar doesn't cover last row */}
        {selectedCount > 0 && <div className="h-16" />}
      </div>

      {/* Verktygsrad när spelare eller ledare är markerade */}
      {selectedCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 max-w-[430px] mx-auto px-4 pb-3 pt-2">
          <div className="bg-card border border-border rounded-xl shadow-lg p-3 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground shrink-0">
              {selectedCount}
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
                    onClick={() => applyStatusToSelected(value)}
                    disabled={updating || updatingLeader}
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
              onClick={removeSelectedPeople}
              disabled={removing || removingLeader}
              className="shrink-0 text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
              aria-label="Ta bort valda"
              title="Ta bort från träning"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { clearSelection(); clearLeaderSelection() }}
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
              {(['Aktiv', 'Aktiv, ej matchklar', 'Gästspelare', 'Vilande', 'Slutat'] as const).filter(statusVisible).map(s => {
                const on = statusFilter.has(s)
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(prev => {
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
          <div className="px-4 py-2">
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
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {(() => {
              const available = (availableData as unknown as { id: number; shortname: string; comment: string | null; status: string }[] | undefined) ?? []
              const filtered = available.filter(p => {
                if (statusFilter.size > 0 && !statusFilter.has(p.status)) return false
                if (addSearch && !p.shortname.toLowerCase().includes(addSearch.toLowerCase())) return false
                return true
              })
              const allSelected = filtered.length > 0 && filtered.every(p => addSelected.has(p.id))
              if (filtered.length === 0) {
                return <p className="text-center text-muted-foreground text-sm py-8">Inga tillgängliga spelare</p>
              }
              return (
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {/* Select all row */}
                  <button
                    onClick={() => setAddSelected(prev => {
                      const next = new Set(prev)
                      if (allSelected) filtered.forEach(p => next.delete(p.id))
                      else filtered.forEach(p => next.add(p.id))
                      return next
                    })}
                    disabled={addingBulk}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                      allSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <VisualCheckbox checked={allSelected} />
                    <span className="text-sm font-semibold text-foreground">Markera alla</span>
                    <span className="ml-auto text-xs text-muted-foreground">{filtered.length} spelare</span>
                  </button>
                  {filtered.map(p => {
                    const isSelected = addSelected.has(p.id)
                    return (
                    <button
                      key={p.id}
                      onClick={() => setAddSelected(prev => {
                        const next = new Set(prev)
                        if (next.has(p.id)) next.delete(p.id)
                        else next.add(p.id)
                        return next
                      })}
                      disabled={addingBulk}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <VisualCheckbox checked={isSelected} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground">{p.shortname}</span>
                        {p.comment && (
                          <span className="text-xs text-muted-foreground italic truncate">{p.comment}</span>
                        )}
                      </div>
                    </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Add-by-status action bar */}
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

      {/* Add leader sheet */}
      <Sheet open={addLeaderOpen} onOpenChange={setAddLeaderOpen}>
        <SheetContent side="bottom" className="h-[70vh] flex flex-col px-0 pb-0">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle>Lägg till ledare</SheetTitle>
          </SheetHeader>
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Sök ledare…"
                value={addLeaderSearch}
                onChange={e => setAddLeaderSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {(() => {
              const available = (availableLeadersData as unknown as { id: number; shortname: string }[] | undefined) ?? []
              const filtered = available.filter(l =>
                !addLeaderSearch || l.shortname.toLowerCase().includes(addLeaderSearch.toLowerCase())
              )
              const allSel = filtered.length > 0 && filtered.every(l => addLeaderSelected.has(l.id))
              if (filtered.length === 0) {
                return <p className="text-center text-muted-foreground text-sm py-8">Inga tillgängliga ledare</p>
              }
              return (
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  <button
                    onClick={() => setAddLeaderSelected(prev => {
                      const next = new Set(prev)
                      if (allSel) filtered.forEach(l => next.delete(l.id))
                      else filtered.forEach(l => next.add(l.id))
                      return next
                    })}
                    disabled={addingLeaderBulk}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                      allSel ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <VisualCheckbox checked={allSel} />
                    <span className="text-sm font-semibold text-foreground">Markera alla</span>
                    <span className="ml-auto text-xs text-muted-foreground">{filtered.length} ledare</span>
                  </button>
                  {filtered.map(l => {
                    const isSel = addLeaderSelected.has(l.id)
                    return (
                      <button
                        key={l.id}
                        onClick={() => setAddLeaderSelected(prev => {
                          const next = new Set(prev)
                          if (next.has(l.id)) next.delete(l.id)
                          else next.add(l.id)
                          return next
                        })}
                        disabled={addingLeaderBulk}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                          isSel ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <VisualCheckbox checked={isSel} />
                        <span className="text-sm font-medium text-foreground">{l.shortname}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>
          {addLeaderSelected.size > 0 && (
            <div className="px-4 py-3 border-t border-border bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {addLeaderSelected.size} vald{addLeaderSelected.size !== 1 ? 'a' : ''}
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
                      onClick={() => handleAddLeadersWithStatus(value)}
                      disabled={addingLeaderBulk}
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

      {/* Copy dialog */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Kopiera träning</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Datum</label>
              <DatePicker value={copyDatePart} onChange={setCopyDatePart} clearable={false} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Tid</label>
              <TimeInput value={copyTimePart} onChange={setCopyTimePart} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Svenskalag</label>
              <input
                type="text"
                value={copySvenskalag}
                onChange={e => setCopySvenskalag(e.target.value)}
                placeholder="https://svenskalag.se/…"
                className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Checkbox
                checked={copyParticipants}
                onCheckedChange={v => setCopyParticipants(v === true)}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Inkludera inbjudna deltagare</span>
                <span className="text-xs text-muted-foreground">Kopierar deltagarlistan med status &ldquo;Kallad&rdquo;</span>
              </div>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCopyOpen(false)} disabled={copying}>
              Avbryt
            </Button>
            <Button
              onClick={handleCopy}
              disabled={!copyDatePart || !copyTimePart || copying}
              style={{ backgroundColor: 'rgb(var(--team-primary))', color: 'rgb(var(--team-accent))' }}
            >
              {copying ? 'Kopierar…' : 'Kopiera'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {training && (
        <TrainingForm
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
          initial={{
            id: training.id,
            type: training.type,
            date: training.date,
            indooroutdoor: training.indooroutdoor,
            notes: training.notes,
            svenskalag: training.svenskalag,
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ta bort träning</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Är du säker på att du vill ta bort den här träningen? Åtgärden kan inte ångras.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Tar bort…' : 'Ta bort'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason / reasontime dialog */}
      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent onOpenAutoFocus={(e) => { e.preventDefault(); reasonInputRef.current?.focus() }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              {reasonPlayer?.img ? (
                <img src={reasonPlayer.img} alt="" className="w-20 h-20 rounded-full object-cover bg-muted flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-muted flex-shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-muted-foreground">Anledning</span>
                <DialogTitle className="truncate">{reasonPlayer?.name}</DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5 w-24 flex-shrink-0">
                <label className="text-sm font-medium text-foreground">Tid</label>
                <input
                  type="text"
                  value={reasonTimeText}
                  onChange={e => setReasonTimeText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !savingReason) { e.preventDefault(); saveReason() } }}
                  placeholder="t.ex. 18:30"
                  className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <label className="text-sm font-medium text-foreground">Anledning</label>
                <div className="flex gap-2">
                  <textarea
                    ref={reasonInputRef}
                    value={reasonText}
                    onChange={e => setReasonText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !savingReason) { e.preventDefault(); saveReason() } }}
                    placeholder="t.ex. Sjuk"
                    rows={1}
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground resize-none overflow-hidden"
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Status</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_ORDER.map(s => {
                  const cfg = STATUS_CONFIG[s]
                  if (!cfg) return null
                  const Icon = cfg.icon
                  const active = reasonStatus === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReasonStatus(s)}
                      aria-label={cfg.label}
                      aria-pressed={active}
                      title={cfg.label}
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        active
                          ? 'opacity-100 scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background'
                          : 'opacity-40 hover:opacity-70'
                      }`}
                      style={{ backgroundColor: cfg.hex }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </button>
                  )
                })}
              </div>
            </div>
            {reasonPlayer && !reasonPlayer.isLeader && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Grupp</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReasonGroup(null)}
                    className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                      reasonGroup == null
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Ingen
                  </button>
                  {REASON_GROUPS.map(g => {
                    const active = reasonGroup === g
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setReasonGroup(g)}
                        className={`h-8 min-w-8 px-1.5 rounded-md text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {groupShort(g)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)} disabled={savingReason}>
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
