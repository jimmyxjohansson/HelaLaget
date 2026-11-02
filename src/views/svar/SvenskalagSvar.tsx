'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, Check, ExternalLink, Loader2, Lock } from 'lucide-react'
import Link from '../../lib/nav'
import { ANY_SQUAD } from '../../lib/team-routes'
import { setTabSquad } from '../../lib/squad-cookie'
import { currentSquad } from '../../lib/squad-store'
import {
  useApplySvenskalagReplies,
  useFindSvenskalagActivity,
  usePreviewSvenskalagReplies,
} from '../../hooks/backend/replies'
import { Button } from '../../lib/shadcn/button'
import { ErrorText, PageHeader, Section } from '../account/shared'
import { bookmarkletHref, type SvarPayload } from './bookmarklet'

const STORE_KEY = 'hl_svenskalag_svar'

type ListKey = 'attending' | 'notattending' | 'invited'
const LISTS: { key: ListKey; label: string; tone: string }[] = [
  { key: 'attending', label: 'Kommer', tone: 'text-emerald-700' },
  { key: 'notattending', label: 'Kan ej', tone: 'text-red-700' },
  { key: 'invited', label: 'Kallade, inte svarat', tone: 'text-muted-foreground' },
]

/** Läser svaren som bokmärket skickade med (efter #) och sparar dem i fliken. */
function readPayload(): SvarPayload | null {
  try {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const data = JSON.parse(decodeURIComponent(hash)) as SvarPayload
      if (data?.v === 1 && data.activity) {
        sessionStorage.setItem(STORE_KEY, JSON.stringify(data))
        // Kortare adress utan svaren, så att den går att ladda om
        history.replaceState(null, '', window.location.pathname)
        return data
      }
    }
    const stored = sessionStorage.getItem(STORE_KEY)
    return stored ? (JSON.parse(stored) as SvarPayload) : null
  } catch {
    return null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('sv-SE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

type Choice = string // "player:12", "leader:3" eller "" (hoppa över)

/** Hämtar kallelsesvar från en aktivitet på Svenskalag med hjälp av ett bokmärke. */
export default function SvenskalagSvar() {
  const squad = currentSquad()
  const [payload, setPayload] = useState<SvarPayload | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ changed: number; skipped: number } | null>(null)
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  // Rader där ledaren öppnat personväljaren
  const [editing, setEditing] = useState<Set<string>>(new Set())

  const find = useFindSvenskalagActivity()
  const preview = usePreviewSvenskalagReplies()
  const apply = useApplySvenskalagReplies()

  useEffect(() => {
    const data = readPayload()
    setPayload(data)
    setReady(true)
    if (!data) return
    ;(async () => {
      const event = await find.trigger({ activityId: data.activity })
      if (!event) {
        setError('Hittade ingen träning eller match i Hela Laget som är kopplad till aktiviteten. Hämta den först via Svenskalag-synk, eller kontrollera att du är ledare i laget.')
        return
      }
      // Aktiviteten hör till ett annat lag: byt lag i den här fliken och ladda om
      if (squad && event.squad_id !== squad.squadId) {
        if (sessionStorage.getItem(`${STORE_KEY}_switch`) === String(event.squad_id)) {
          setError('Aktiviteten hör till ett lag som du inte kan öppna här.')
          return
        }
        sessionStorage.setItem(`${STORE_KEY}_switch`, String(event.squad_id))
        setTabSquad(event.squad_id)
        window.location.assign(`/${ANY_SQUAD}/svenskalag/svar`)
        return
      }
      sessionStorage.removeItem(`${STORE_KEY}_switch`)
      const res = await preview.trigger({ kind: event.kind, id: event.id, lists: data.lists })
      const initial: Record<string, Choice> = {}
      for (const r of res.rows) initial[r.key] = r.match && !r.locked ? `${r.match.type}:${r.match.id}` : ''
      setChoices(initial)
    })().catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const result = preview.data
  const rows = useMemo(() => result?.rows ?? [], [result])
  const players = result?.people.filter((p) => p.type === 'player') ?? []
  const leaders = result?.people.filter((p) => p.type === 'leader') ?? []
  const selected = rows.filter((r) => choices[r.key] && !r.locked)

  async function save() {
    if (!result) return
    setError(null)
    try {
      const items = selected.map((r) => {
        const [type, id] = choices[r.key].split(':')
        const manual = !r.match || `${r.match.type}:${r.match.id}` !== choices[r.key]
        return {
          type: type as 'player' | 'leader',
          id: Number(id),
          list: r.list,
          comment: r.comment,
          time: r.time,
          linkName: manual ? r.name : null,
        }
      })
      const res = await apply.trigger({ kind: result.event.kind, id: result.event.id, items })
      setSaved(res)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!ready) return null

  const saveButton = (
    <Button onClick={save} disabled={apply.loading || selected.length === 0} className="w-full">
      {apply.loading && <Loader2 className="w-4 h-4 animate-spin" />}
      Spara {selected.length} svar
    </Button>
  )

  const eventPath = result ? `/${result.event.kind === 'training' ? 'trainings' : 'matches'}/${result.event.id}` : null

  return (
    <div className="flex flex-col min-h-full pb-8">
      <PageHeader title="Svar från Svenskalag" subtitle={squad ? `${squad.organizationName} ${squad.squadName}` : ''} />
      {error && (
        <div className="px-4 pt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}

      {!payload && <Instructions />}

      {payload && !result && !error && (
        <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Läser svaren…
        </div>
      )}

      {result && (
        <>
          <Section title={result.event.kind === 'training' ? 'Träning' : 'Match'}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{result.event.title || (result.event.kind === 'training' ? 'Träning' : 'Match')}</div>
                <div className="text-sm text-muted-foreground">{formatDate(result.event.date)}</div>
              </div>
              {payload?.url && (
                <a href={payload.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground inline-flex items-center gap-1 shrink-0">
                  Svenskalag <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lästa rader: {LISTS.map((l) => `${l.label.split(',')[0]} ${payload?.lists[l.key]?.length ?? '–'}`).join(' · ')}
            </p>
            {!saved && rows.length > 0 && <div className="mt-3">{saveButton}</div>}
          </Section>

          {saved ? (
            <Section title="Klart">
              <p className="text-sm">
                <Check className="inline w-4 h-4 text-emerald-600 mr-1" />
                {saved.changed} svar sparade{saved.skipped ? `, ${saved.skipped} hoppades över (närvaro redan rapporterad)` : ''}.
              </p>
              {eventPath && (
                <Button asChild className="mt-3">
                  <Link href={eventPath}>Öppna {result.event.kind === 'training' ? 'träningen' : 'matchen'}</Link>
                </Button>
              )}
            </Section>
          ) : (
            <>
              {rows.length === 0 && (
                <Section title="Svar">
                  <p className="text-sm text-muted-foreground">
                    Hittade inga namn i listorna. Öppna aktiviteten i Svenskalag, kontrollera att du är inloggad och kör bokmärket igen.
                  </p>
                </Section>
              )}
              {LISTS.map((l) => {
                const list = rows.filter((r) => r.list === l.key)
                if (!list.length) return null
                return (
                  <Section key={l.key} title={`${l.label} (${list.length})`}>
                    <ul className="-mx-1 divide-y">
                      {list.map((r) => (
                        <ReplyItem
                          key={r.key}
                          row={r}
                          tone={l.tone}
                          choice={choices[r.key] ?? ''}
                          editing={editing.has(r.key)}
                          players={players}
                          leaders={leaders}
                          onChoice={(v) => setChoices((c) => ({ ...c, [r.key]: v }))}
                          onEdit={() => setEditing((e) => new Set(e).add(r.key))}
                        />
                      ))}
                    </ul>
                  </Section>
                )
              })}
              {rows.length > 0 && (
                <div className="px-4 pt-2 flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Kommentarer sparas som anledning. Klockslaget sparas bara när svaret kom samma dag som aktiviteten
                    (fetstilt). Namn som du kopplar för hand kommer appen ihåg till nästa gång.
                  </p>
                  {saveButton}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

type Row = NonNullable<ReturnType<typeof usePreviewSvenskalagReplies>['data']>['rows'][number]
type PersonOpt = { type: 'player' | 'leader'; id: number; name: string }

/** En rad: kryssruta, namn, svarstid och kommentar, och vilken status det blir. */
function ReplyItem({ row: r, tone, choice, editing, players, leaders, onChoice, onEdit }: {
  row: Row
  tone: string
  choice: Choice
  editing: boolean
  players: PersonOpt[]
  leaders: PersonOpt[]
  onChoice: (v: Choice) => void
  onEdit: () => void
}) {
  const matchValue = r.match ? `${r.match.type}:${r.match.id}` : ''
  const chosen = [...players, ...leaders].find((p) => `${p.type}:${p.id}` === choice)
  const showSelect = !r.locked && (!r.match || editing)
  const changes = !!choice && !r.locked && r.current !== r.next
  return (
    <li className={`px-1 py-1.5 ${r.locked || (r.match && !choice) ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-[rgb(var(--team-primary))]"
          checked={!!choice && !r.locked}
          disabled={r.locked || (!r.match && !choice)}
          onChange={(e) => onChoice(e.target.checked ? choice || matchValue : '')}
          aria-label={`Ta med ${r.name}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onEdit}
              disabled={r.locked}
              className={`font-medium text-sm truncate text-left ${tone}`}
              title="Byt person"
            >
              {r.name}
            </button>
            {chosen && chosen.name !== r.name && (
              <span className="text-xs text-muted-foreground truncate">→ {chosen.name}</span>
            )}
          </div>
          {(r.answered || r.comment) && (
            <div className="text-xs text-muted-foreground truncate">
              {r.answered && <span className={r.time ? 'font-semibold text-foreground' : ''}>{r.answered}</span>}
              {r.answered && r.comment && ' · '}
              {r.comment && <span className="italic">{r.comment}</span>}
            </div>
          )}
        </div>
        <div className="shrink-0 text-[11px]">
          {r.locked ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="w-3 h-3" />{r.current}</span>
          ) : !choice ? (
            <span className="text-muted-foreground">{r.match ? 'Hoppas över' : 'Okänd'}</span>
          ) : changes ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{r.next}</span>
          ) : (
            <span className="text-muted-foreground">Oförändrad</span>
          )}
        </div>
      </div>
      {showSelect && (
        <select
          value={choice}
          onChange={(e) => onChoice(e.target.value)}
          className={`mt-1 ml-[1.625rem] h-7 w-[calc(100%-1.625rem)] rounded-md border bg-background px-2 text-xs ${!choice ? 'border-amber-500' : ''}`}
        >
          <option value="">{r.match ? 'Hoppa över' : 'Hittade ingen – välj person'}</option>
          <optgroup label="Spelare">
            {players.map((p) => <option key={`p${p.id}`} value={`player:${p.id}`}>{p.name}</option>)}
          </optgroup>
          <optgroup label="Ledare">
            {leaders.map((p) => <option key={`l${p.id}`} value={`leader:${p.id}`}>{p.name}</option>)}
          </optgroup>
        </select>
      )}
    </li>
  )
}

/** Hur man lägger till och använder bokmärket. */
export function Instructions() {
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    // React tillåter inte javascript:-länkar i href, så den sätts direkt på elementet
    ref.current?.setAttribute('href', bookmarkletHref(window.location.origin))
  }, [])
  return (
    <Section title="Kallelsesvar">
      <div className="text-sm space-y-3">
        <p>
          Svenskalag kräver inloggning, så svaren läses av ett bokmärke i din egen webbläsare. Det läser listorna
          Kommer, Kan ej och Kallade på en aktivitet och öppnar svaren här, där du granskar innan något sparas.
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Dra knappen nedan till bokmärkesfältet i webbläsaren (görs en gång, på datorn).</li>
          <li>Öppna träningen eller matchen på Svenskalag, inloggad som ledare.</li>
          <li>Klicka på bokmärket. Svaren öppnas i Hela Laget i en ny flik.</li>
        </ol>
        <a
          ref={ref}
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 font-medium cursor-grab"
          title="Dra till bokmärkesfältet"
        >
          <Bookmark className="w-4 h-4" /> Svar till Hela Laget
        </a>
        <p className="text-xs text-muted-foreground">
          Aktiviteten måste redan finnas i Hela Laget (hämtad via Svenskalag-synk). Svaren skickas efter # i
          adressen och sparas först när du trycker Spara.
        </p>
      </div>
    </Section>
  )
}
