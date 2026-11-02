'use client'

import Link from '../../lib/nav'
import { useEffect, useState } from 'react'
import { CalendarDays, Check, ExternalLink, Loader2, Medal, RefreshCw, Trophy, X } from 'lucide-react'
import {
  useAcknowledgeRemovedEvent,
  useDecideSvenskalagEvent,
  useGetSvenskalagStatus,
  useSyncSvenskalag,
} from '../../hooks/backend/svenskalag'
import { currentSquad } from '../../lib/squad-store'
import { Button } from '../../lib/shadcn/button'
import { ErrorText, PageHeader, Section } from './shared'
import { Instructions } from '../svar/SvenskalagSvar'

// Tider sparas som väggklocka i UTC (samma som resten av appen)
function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function formatSynced(iso: string | null) {
  if (!iso) return 'aldrig'
  return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Stockholm' })
}

const TARGET_PATH: Record<string, string> = { trainings: '/trainings', matches: '/matches', cups: '/cups' }

/** Import från Svenskalags kalender: status, hämta nu, granska och borttagna. */
export default function Svenskalag() {
  const squad = currentSquad()
  const status = useGetSvenskalagStatus()
  const sync = useSyncSvenskalag()
  const decide = useDecideSvenskalagEvent()
  const acknowledge = useAcknowledgeRemovedEvent()
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [created, setCreated] = useState<Record<number, string>>({})

  useEffect(() => {
    status.trigger().catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSync() {
    setError(null)
    try {
      await sync.trigger()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
    await status.trigger().catch(() => {})
  }

  async function choose(externalId: number, action: 'training' | 'match' | 'cup' | 'ignore') {
    setError(null)
    setBusyId(externalId)
    try {
      const res = await decide.trigger({ externalId, action })
      if (res.targetTable && res.targetId) setCreated((c) => ({ ...c, [externalId]: `${TARGET_PATH[res.targetTable!]}/${res.targetId}` }))
      await status.trigger()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    } finally {
      setBusyId(null)
    }
  }

  const s = status.data

  return (
    <div className="flex flex-col min-h-full pb-8">
      <PageHeader title="Svenskalag" subtitle={squad ? `${squad.organizationName} ${squad.squadName}` : ''} />
      {error && (
        <div className="px-4 pt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}

      {!s && status.loading && (
        <div className="p-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {s && !s.configured && (
        <Section title="Kom igång">
          <p className="text-sm text-muted-foreground">
            Träningar och matcher kan hämtas automatiskt från lagets kalender i Svenskalag. Lagets admin lägger in
            kalenderlänken under{' '}
            {squad?.role === 'admin' ? (
              <Link href="/lag/installningar" className="underline underline-offset-4">
                Laginställningar
              </Link>
            ) : (
              'Mer → Laginställningar'
            )}
            . Länken finns i Svenskalag under lagets kalender → Prenumerera.
          </p>
        </Section>
      )}

      {s?.configured && (
        <Section title="Hämtning">
          <p className="text-sm">
            Senast hämtat: <span className="font-medium">{formatSynced(s.syncedAt)}</span>
          </p>
          {s.message && <p className="text-sm text-muted-foreground mt-1">{s.message}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            Hämtas automatiskt varje natt. Nya träningar och matcher skapas direkt; ändrade tider förs över. Inget raderas.
          </p>
          <Button className="mt-3" onClick={runSync} disabled={sync.loading}>
            {sync.loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Hämta från Svenskalag nu
          </Button>
        </Section>
      )}

      {s && <Instructions />}

      {s?.configured && (
        <Section title={`Att granska${s.pending.length ? ` (${s.pending.length})` : ''}`}>
          {s.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inget att granska.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Aktiviteter som inte gick att tolka säkert, t.ex. cuper. Välj vad de ska bli i Hela Laget.
              </p>
              <ul className="flex flex-col gap-3">
                {s.pending.map((e) => (
                  <li key={e.externalId} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{formatWhen(e.startsAt)}</p>
                        <p className="font-medium">{e.title}</p>
                        {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                      </div>
                      {e.url && (
                        <a href={e.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Öppna i Svenskalag">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => choose(e.externalId, 'cup')}>
                        <Medal /> Cup
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => choose(e.externalId, 'training')}>
                        <CalendarDays /> Träning
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => choose(e.externalId, 'match')}>
                        <Trophy /> Match
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => choose(e.externalId, 'ignore')}>
                        <X /> Ignorera
                      </Button>
                      {busyId === e.externalId && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {Object.keys(created).length > 0 && (
            <div className="mt-3 text-sm flex flex-col gap-1">
              {Object.entries(created).map(([id, path]) => (
                <Link key={id} href={path} className="text-primary underline underline-offset-4">
                  Öppna det som skapades ({path})
                </Link>
              ))}
            </div>
          )}
        </Section>
      )}

      {s && s.removed.length > 0 && (
        <Section title={`Borttagna i Svenskalag (${s.removed.length})`}>
          <p className="text-sm text-muted-foreground mb-3">
            Finns i Hela Laget men inte längre i Svenskalags kalender. Kontrollera och ta bort i Hela Laget om de är inställda.
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {s.removed.map((e) => (
              <li key={e.externalId} className="py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{formatWhen(e.startsAt)}</p>
                  {e.targetTable && e.targetId ? (
                    <Link href={`${TARGET_PATH[e.targetTable]}/${e.targetId}`} className="text-sm font-medium underline underline-offset-4">
                      {e.title === '(borttagen i Svenskalag)' ? 'Öppna i Hela Laget' : e.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{e.title}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    acknowledge
                      .trigger({ externalId: e.externalId })
                      .then(() => status.trigger())
                      .catch((err: Error) => setError(err.message))
                  }
                >
                  <Check /> Kontrollerad
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
