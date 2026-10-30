'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useGetMatch, useUpdateMatchGoalkeeper, useAddMatchParticipants, useRemoveParticipants, useUpdateParticipantsStatus, useUpdateParticipantReason } from '../hooks/backend/matches'
import { useGetPlayers } from '../hooks/backend/players'
import { Combobox } from '../components/Combobox'
import { Label } from '../lib/shadcn/label'
import { Button } from '../lib/shadcn/button'
import ParticipantsSection, {
  type ParticipantRow,
  type PlayerOption,
} from './ui/ParticipantsSection'

interface MatchData {
  id: number
  goalkeeper: number | null
  opponent: string | null
  date: string
}

interface MatchResult {
  match: MatchData | null
  participants: ParticipantRow[]
}

export default function EditParticipants() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: matchData, loading: matchLoading, trigger: fetchMatch } = useGetMatch()
  const { data: playersData, trigger: fetchPlayers } = useGetPlayers()
  const { loading: savingGk, trigger: saveGoalkeeper } = useUpdateMatchGoalkeeper()
  const { trigger: addParticipants, loading: adding } = useAddMatchParticipants()
  const { trigger: removeParticipants, loading: removing } = useRemoveParticipants()
  const { trigger: updateStatus, loading: updating } = useUpdateParticipantsStatus()
  const { trigger: updateReason, loading: savingReason } = useUpdateParticipantReason()

  const [goalkeeper, setGoalkeeper] = useState<string>('')
  const [savedGk, setSavedGk] = useState(false)

  useEffect(() => {
    if (id) fetchMatch({ id: Number(id) })
    fetchPlayers({})
  }, [id])

  const result = matchData as unknown as MatchResult | undefined
  const match = result?.match
  const participants = result?.participants ?? []

  // Initialize goalkeeper from loaded match
  useEffect(() => {
    if (match) {
      setGoalkeeper(match.goalkeeper != null ? String(match.goalkeeper) : '')
    }
  }, [match?.id, match?.goalkeeper])

  const allPlayers: PlayerOption[] = ((playersData as unknown as Array<{
    id: number
    firstname: string
    lastname: string
    shortname: string
    img: string
    status: string
  }> | undefined) ?? []).map(p => ({
    id: p.id,
    firstname: p.firstname,
    lastname: p.lastname,
    shortname: p.shortname,
    img: p.img,
    status: p.status,
  }))

  // Goalkeeper can only be a participant with status "Kommer" or "Inbjuden".
  const eligibleGoalkeepers = participants.filter(
    p => p.player != null && (p.status === 'Kommer' || p.status === 'Inbjuden'),
  )
  const goalkeeperOptions = eligibleGoalkeepers.map(p => ({
    value: String(p.player),
    label: p.shortname ?? `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim(),
    imageUrl: p.img,
  }))
  // Keep the currently-selected goalkeeper visible even if not eligible.
  if (goalkeeper && !goalkeeperOptions.some(o => o.value === goalkeeper)) {
    const current = allPlayers.find(p => String(p.id) === goalkeeper)
    if (current) {
      goalkeeperOptions.unshift({
        value: goalkeeper,
        label: current.shortname ?? `${current.firstname} ${current.lastname}`.trim(),
        imageUrl: current.img,
      })
    }
  }

  async function refetchMatch() {
    if (id) await fetchMatch({ id: Number(id) }, { skipCache: true })
  }

  async function handleGoalkeeperChange(value: string) {
    setGoalkeeper(value)
    setSavedGk(false)
    if (!id) return
    await saveGoalkeeper({
      id: Number(id),
      goalkeeper: value ? Number(value) : null,
    })
    setSavedGk(true)
    setTimeout(() => setSavedGk(false), 1500)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-[#FFCF08] px-4 pt-6 pb-4" style={{ backgroundColor: '#106A37' }}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[#FFCF08]/80 hover:text-[#FFCF08] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Tillbaka</span>
          </button>
        </div>
        <h1 className="text-lg font-bold text-[#FFCF08]">Deltagare</h1>
        {match?.opponent && (
          <p className="text-sm text-[#FFCF08]/70">vs {match.opponent}</p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-5">
        {matchLoading || !match ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <Section title="Målvakt">
              <Field
                label="Målvakt för matchen"
                hint={
                  savingGk
                    ? <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Sparar…</span>
                    : savedGk
                    ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><Check className="w-3 h-3" /> Sparat</span>
                    : null
                }
              >
                <Combobox
                  options={goalkeeperOptions}
                  value={goalkeeper}
                  onValueChange={handleGoalkeeperChange}
                  placeholder="Välj målvakt…"
                  searchPlaceholder="Sök spelare…"
                  emptyMessage="Inga deltagare med status Kommer eller Inbjuden."
                  className="w-full"
                />
              </Field>
            </Section>

            {id && (
              <ParticipantsSection
                participants={participants}
                allPlayers={allPlayers}
                onChanged={refetchMatch}
                onAdd={async (playerIds, status) => {
                  await addParticipants({ match: Number(id), playerIds, status })
                }}
                onRemove={async playerIds => {
                  await removeParticipants({ match: Number(id), playerIds })
                }}
                onUpdateStatus={async (playerIds, status) => {
                  await updateStatus({ match: Number(id), playerIds, status })
                }}
                onUpdateReason={async (participantId, reason) => {
                  await updateReason({ id: participantId, reason })
                }}
                adding={adding}
                removing={removing}
                updating={updating}
                savingReason={savingReason}
                removeTarget="matchen"
              />
            )}

            <Button
              variant="outline"
              onClick={() => router.push(`/matches/${id}`)}
              className="w-full"
            >
              Klar
            </Button>

            <div className="h-4" />
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <span className="text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
