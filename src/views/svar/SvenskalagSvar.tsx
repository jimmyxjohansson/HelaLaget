'use client'

import { useSvenskalagExtension } from './SyncRepliesButton'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, CloudDownload, Check, ExternalLink, Loader2, Lock } from 'lucide-react'
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
  // Rader som sparats (nycklar) och hur det gick
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)
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
      // Spara direkt allt som kunde kopplas till en person i laget
      const auto = res.rows.filter((r) => r.match && !r.locked)
      if (auto.length) {
        await apply.trigger({ kind: event.kind, id: event.id, items: auto.map((r) => toItem(r, initial[r.key])) })
        setSavedKeys(new Set(auto.map((r) => r.key)))
      }
      setDone(true)
    })().catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const result = preview.data
  const rows = useMemo(() => result?.rows ?? [], [result])
  const players = result?.people.filter((p) => p.type === 'player') ?? []
  const leaders = result?.people.filter((p) => p.type === 'leader') ?? []
  const saved = rows.filter((r) => savedKeys.has(r.key))
  const changed = saved.filter((r) => r.current !== r.next)
  const locked = rows.filter((r) => r.locked)
  // Namn som inte hittades i laget och inte sparats än
  const unknown = rows.filter((r) => !r.match && !r.locked && !savedKeys.has(r.key))
  const toSave = unknown.filter((r) => choices[r.key])

  async function saveUnknown() {
    if (!result) return
    setError(null)
    try {
      await apply.trigger({ kind: result.event.kind, id: result.event.id, items: toSave.map((r) => toItem(r, choices[r.key])) })
      setSavedKeys((k) => new Set([...k, ...toSave.map((r) => r.key)]))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!ready) return null

  const kindWord = result?.event.kind === 'training' ? 'träningen' : result?.event.kind === 'cup' ? 'cupen' : 'matchen'
  const PATH = { training: 'trainings', match: 'matches', cup: 'cups' } as const
  const LABEL = { training: 'Träning', match: 'Match', cup: 'Cup' } as const
  const eventPath = result ? `/${PATH[result.event.kind]}/${result.event.id}` : null
  const listOf = (r: Row) => LISTS.find((l) => l.key === r.list)!

  return (
    <div className="flex flex-col min-h-full pb-8">
      <PageHeader title="Svar från Svenskalag" subtitle={squad ? `${squad.organizationName} ${squad.squadName}` : ''} />
      {error && (
        <div className="px-4 pt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}

      {!payload && <Instructions />}

      {payload && !done && !error && (
        <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {result ? 'Sparar svaren…' : 'Läser svaren…'}
        </div>
      )}

      {result && done && (
        <>
          <Section title={LABEL[result.event.kind]}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{result.event.title || LABEL[result.event.kind]}</div>
                <div className="text-sm text-muted-foreground">{formatDate(result.event.date)}</div>
              </div>
              {payload?.url && (
                <a href={payload.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground inline-flex items-center gap-1 shrink-0">
                  Svenskalag <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-sm mt-3">
              <Check className="inline w-4 h-4 text-emerald-600 mr-1 -mt-0.5" />
              <span className="font-medium">{saved.length} svar sparade</span>
              {saved.length > 0 && <span className="text-muted-foreground">, {changed.length} ändrade</span>}
            </p>
            {locked.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <Lock className="inline w-3 h-3 mr-1 -mt-0.5" />
                {locked.length} med redan rapporterad närvaro ändrades inte.
              </p>
            )}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Hittade inga namn i listorna. Kontrollera att du är inloggad på Svenskalag och kör bokmärket igen.
              </p>
            )}
            {eventPath && (
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href={eventPath}>Öppna {kindWord}</Link>
              </Button>
            )}
          </Section>

          {unknown.length > 0 && (
            <Section title={`Okända namn (${unknown.length})`}>
              <p className="text-xs text-muted-foreground mb-1">
                Välj vem i laget namnet hör till. Appen kommer ihåg kopplingen till nästa gång.
              </p>
              <ul className="-mx-1 divide-y">
                {unknown.map((r) => (
                  <ReplyItem
                    key={r.key}
                    row={r}
                    tone={listOf(r).tone}
                    choice={choices[r.key] ?? ''}
                    editing
                    players={players}
                    leaders={leaders}
                    onChoice={(v) => setChoices((c) => ({ ...c, [r.key]: v }))}
                    onEdit={() => {}}
                  />
                ))}
              </ul>
              <Button onClick={saveUnknown} disabled={apply.loading || toSave.length === 0} className="mt-3 w-full">
                {apply.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Spara {toSave.length} svar
              </Button>
            </Section>
          )}

          {changed.length > 0 && (
            <Section title="Ändrat">
              <ul className="text-sm divide-y">
                {changed.map((r) => (
                  <li key={r.key} className="py-1 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <span className={listOf(r).tone}>{result.people.find((p) => `${p.type}:${p.id}` === choices[r.key])?.name ?? r.name}</span>
                      {(r.comment || r.list === 'notattending') && (
                        <span className="text-xs text-muted-foreground italic"> · {r.comment || 'Ingen anledning'}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] rounded bg-muted px-1.5 py-0.5 font-medium">{r.next}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

/** Raden som den skickas till servern. */
function toItem(r: Row, choice: Choice) {
  const [type, id] = choice.split(':')
  const manual = !r.match || `${r.match.type}:${r.match.id}` !== choice
  return {
    type: type as 'player' | 'leader',
    id: Number(id),
    list: r.list,
    comment: r.comment,
    time: r.time,
    repliedAt: r.repliedAt,
    linkName: manual ? r.name : null,
  }
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
  const hasExtension = useSvenskalagExtension()
  useEffect(() => {
    // React tillåter inte javascript:-länkar i href, så den sätts direkt på elementet
    ref.current?.setAttribute('href', bookmarkletHref(window.location.origin))
  }, [])
  return (
    <Section title="Kallelsesvar">
      <div className="text-sm space-y-4">
        <p>
          Svenskalag kräver inloggning, så svaren läses i din egen webbläsare där du är inloggad. De sparas direkt i
          Hela Laget: Kommer blir Anmäld, Kan ej blir Ej närvarande och Kallade blir Kallad.
        </p>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="font-medium flex items-center gap-2">
            <CloudDownload className="w-4 h-4" /> Synka med en knapp (Chrome eller Edge på datorn)
            {hasExtension && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">Installerat</span>}
          </p>
          <p className="text-muted-foreground">
            Med tillägget får träningar och matcher en knapp, Synka svar, som hämtar svaren från Svenskalag åt dig.
          </p>
          {!hasExtension && (
            <>
              <ol className="list-decimal pl-5 space-y-1">
                <li><a href="/hela-laget-svenskalag.zip" download className="font-medium underline underline-offset-4">Ladda ner tillägget</a> och packa upp filen.</li>
                <li>Skriv <span className="font-mono text-xs">chrome://extensions</span> (eller <span className="font-mono text-xs">edge://extensions</span>) i adressfältet.</li>
                <li>Slå på <span className="font-medium">Utvecklarläge</span> uppe till höger.</li>
                <li>Välj <span className="font-medium">Läs in okomprimerat</span> och välj den uppackade mappen hela-laget-svenskalag.</li>
                <li>Ladda om Hela Laget. Var inloggad på Svenskalag i samma webbläsare.</li>
              </ol>
            </>
          )}
          {hasExtension && (
            <p>Tryck på molnet med pilen på en träning eller match som är hämtad från Svenskalag.</p>
          )}
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="font-medium flex items-center gap-2"><Bookmark className="w-4 h-4" /> Eller med ett bokmärke</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Dra knappen nedan till bokmärkesfältet i webbläsaren (görs en gång, på datorn).</li>
            <li>Öppna träningen eller matchen på Svenskalag, inloggad som ledare.</li>
            <li>Klicka på bokmärket. Svaren sparas och en kvittens öppnas i en ny flik.</li>
          </ol>
          <a
            ref={ref}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 font-medium cursor-grab"
            title="Dra till bokmärkesfältet"
          >
            <Bookmark className="w-4 h-4" /> Svar till Hela Laget
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          Aktiviteten måste redan finnas i Hela Laget (hämtad via Svenskalag-synk). Rapporterad närvaro skrivs aldrig
          över, och namn som appen inte känner igen får du koppla själv.
        </p>
      </div>
    </Section>
  )
}
