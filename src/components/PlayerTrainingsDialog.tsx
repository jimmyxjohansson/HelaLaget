'use client'

import { useEffect } from 'react'
import { Home, Sun, Loader2 } from 'lucide-react'
import { useGetPlayerTrainings } from '../hooks/backend/trainings'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../lib/shadcn/dialog'

interface PlayerTraining {
  id: number
  date: string
  indooroutdoor: string | null
  type: string
  status: string | null
  reason: string | null
  reasontime: string | null
}

const STATUS_HEX: Record<string, string> = {
  'Närvarande': '#008000',
  'Närvarande, ej hela': '#008000',
  'Anmäld': '#0000FF',
  'Kallad': '#9333ea',
  'Ej närvarande': '#FF0000',
  'Anmäld, kom ej': '#FFA500',
  'Annan aktivitet': '#69A969',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

export function PlayerTrainingsDialog({
  open,
  onOpenChange,
  playerId,
  playerName,
  date1,
  date2,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  playerId: number | null
  playerName: string
  date1?: string
  date2?: string
}) {
  const { data, loading, trigger } = useGetPlayerTrainings()

  useEffect(() => {
    if (open && playerId != null) {
      trigger(date1 && date2 ? { playerId, date1, date2 } : { playerId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playerId, date1, date2])

  const rows = (data as unknown as PlayerTraining[] | undefined) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[460px] px-3">
        <DialogHeader>
          <DialogTitle>Träningar – {playerName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto -mx-2 px-2">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laddar…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Inga träningar.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pl-1 pr-1 font-semibold">Datum</th>
                  <th className="py-2 px-1 font-semibold text-center" title="Miljö"></th>
                  <th className="py-2 px-1 font-semibold">Typ</th>
                  <th className="py-2 px-1 font-semibold">Status</th>
                  <th className="py-2 pr-1 pl-1 font-semibold">Anledning</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const hex = r.status ? STATUS_HEX[r.status] : undefined
                  const isIndoor = r.indooroutdoor === 'Inomhus'
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 align-top">
                      <td className="py-1.5 pl-1 pr-1 whitespace-nowrap text-foreground">{formatDate(r.date)}</td>
                      <td className="py-1.5 px-1 text-center text-muted-foreground">
                        {r.indooroutdoor ? (
                          isIndoor
                            ? <Home className="w-3.5 h-3.5 inline" aria-label="Inomhus" />
                            : <Sun className="w-3.5 h-3.5 inline" aria-label="Utomhus" />
                        ) : '–'}
                      </td>
                      <td className="py-1.5 px-1 text-foreground whitespace-nowrap">{r.type}</td>
                      <td className="py-1.5 px-1">
                        {r.status ? (
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: hex ?? '#6b7280' }}
                            title={r.status}
                            aria-label={r.status}
                          />
                        ) : '–'}
                      </td>
                      <td className="py-1.5 pr-1 pl-1 text-muted-foreground">{[r.reasontime, r.reason].filter(Boolean).join(' – ') || '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
