'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  useGetCupParticipants,
  useAddCupParticipants,
  useRemoveCupParticipants,
  useUpdateCupParticipantsStatus,
  useUpdateCupParticipantReason,
} from '../hooks/backend/cups'
import { useGetPlayers } from '../hooks/backend/players'
import { Button } from '../lib/shadcn/button'
import ParticipantsSection, {
  type ParticipantRow,
  type PlayerOption,
} from './ui/ParticipantsSection'

interface CupInfo {
  id: number
  name: string
}

interface CupParticipantsResult {
  cup: CupInfo | null
  participants: ParticipantRow[]
}

export default function EditCupParticipants() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data, loading, trigger: fetchParticipants } = useGetCupParticipants()
  const { data: playersData, trigger: fetchPlayers } = useGetPlayers()
  const { trigger: addParticipants, loading: adding } = useAddCupParticipants()
  const { trigger: removeParticipants, loading: removing } = useRemoveCupParticipants()
  const { trigger: updateStatus, loading: updating } = useUpdateCupParticipantsStatus()
  const { trigger: updateReason, loading: savingReason } = useUpdateCupParticipantReason()

  useEffect(() => {
    if (id) fetchParticipants({ cupId: Number(id) })
    fetchPlayers({})
  }, [id])

  const result = data as unknown as CupParticipantsResult | undefined
  const cup = result?.cup
  const participants = result?.participants ?? []

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

  async function refetch() {
    if (id) await fetchParticipants({ cupId: Number(id) }, { skipCache: true })
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
        {cup?.name && <p className="text-sm text-[#FFCF08]/70">{cup.name}</p>}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-5">
        {loading && !cup ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            {id && (
              <ParticipantsSection
                participants={participants}
                allPlayers={allPlayers}
                onChanged={refetch}
                onAdd={async (playerIds, status) => {
                  await addParticipants({ cup: Number(id), playerIds, status })
                }}
                onRemove={async playerIds => {
                  await removeParticipants({ cup: Number(id), playerIds })
                }}
                onUpdateStatus={async (playerIds, status) => {
                  await updateStatus({ cup: Number(id), playerIds, status })
                }}
                onUpdateReason={async (participantId, reason) => {
                  await updateReason({ id: participantId, reason })
                }}
                adding={adding}
                removing={removing}
                updating={updating}
                savingReason={savingReason}
                removeTarget="cupen"
              />
            )}

            <Button variant="outline" onClick={() => router.push(`/cups/${id}`)} className="w-full">
              Klar
            </Button>

            <div className="h-4" />
          </>
        )}
      </div>
    </div>
  )
}
