'use client'

import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import Link from '../../lib/nav'
import { cn } from '../../lib/shadcn/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { useGetPlayerStats } from '../../hooks/backend/players'
import { useGetLeaderStats } from '../../hooks/backend/leaders'
import { usePersistentState } from '../../hooks/usePersistentState'
import PlayerStats, { StatsSummary, TrainingTab } from './PlayerStats'

export type StatsPerson = { kind: 'player' | 'leader'; id: number; name: string }

const PERIODS = [
  { months: 1, label: '1 mån' },
  { months: 2, label: '2 mån' },
  { months: 3, label: '3 mån' },
  { months: 6, label: '6 mån' },
  { months: 12, label: '1 år' },
  { months: 0, label: 'Alla' },
]

/** Samma statistik som på spelarsidan, i en popup. Ledare får sina träningar. */
export default function PersonStatsDialog({ person, onClose }: { person: StatsPerson | null; onClose: () => void }) {
  const [months, setMonths] = usePersistentState<number>('hl-stats-popup-months', 2)
  const player = useGetPlayerStats()
  const leader = useGetLeaderStats()
  const [error, setError] = useState<string | null>(null)
  // Svaret sparas med personen, så att förra personens siffror inte visas medan nästa laddas
  const [loaded, setLoaded] = useState<{ key: string; player?: typeof player.data; leader?: typeof leader.data } | null>(null)
  const key = person ? `${person.kind}-${person.id}` : ''

  useEffect(() => {
    if (!person) return
    setError(null)
    const fail = (e: Error) => setError(e.message)
    if (person.kind === 'player') player.trigger({ playerId: person.id, months }).then((d) => setLoaded({ key, player: d })).catch(fail)
    else leader.trigger({ leaderId: person.id, months }).then((d) => setLoaded({ key, leader: d })).catch(fail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, months])

  const isPlayer = person?.kind === 'player'
  const playerData = loaded?.key === key ? loaded.player ?? null : null
  const leaderData = loaded?.key === key ? loaded.leader ?? null : null

  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[920px] overflow-y-auto px-3 sm:px-5">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-6">
            {person?.name}
            {isPlayer && person && (
              <Link href={`/players/${person.id}?months=${months}`} className="flex items-center text-sm font-normal text-primary hover:underline">
                Spelarsidan <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Period</span>
          {PERIODS.map((p) => (
            <button key={p.months} type="button" onClick={() => setMonths(p.months)}
              className={cn('rounded-full px-2.5 py-1 text-xs font-medium',
                months === p.months ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {p.label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {isPlayer ? (
          <div className="flex flex-col gap-3">
            <StatsSummary data={playerData} loading={player.loading} />
            <PlayerStats data={playerData} loading={player.loading} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <StatsSummary data={leaderData} loading={leader.loading} trainingOnly />
            {!leaderData ? (
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
            ) : leaderData.trainings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Inga träningar under perioden.</p>
            ) : (
              <div className={cn('flex flex-col gap-3', leader.loading && 'opacity-60')}>
                <TrainingTab trainings={leaderData.trainings} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
