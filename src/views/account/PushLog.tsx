'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, ChevronDown, FlaskConical, Lock, Loader2, Search } from 'lucide-react'
import Link, { useRouter } from '../../lib/nav'
import SquadLogo from '../../components/SquadLogo'
import { getMe } from '../../lib/squad-store'
import { cn } from '../../lib/shadcn/utils'
import { useGetPushLog, useSetPushAdminOnly } from '../../hooks/backend/notifications'
import type { PushLogRow } from '@/server/functions/notifications/getPushLog'

const AUDIENCE: Record<PushLogRow['audience'], string> = {
  squad: 'Alla som följer laget',
  leaders: 'Ledare',
  admins: 'Admin',
}

const DAY = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Stockholm' })
const TIME = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
const dayLabel = (iso: string) => {
  const today = dayKey(new Date().toISOString())
  const yesterday = dayKey(new Date(Date.now() - 864e5).toISOString())
  const k = dayKey(iso)
  if (k === today) return 'I dag'
  if (k === yesterday) return 'I går'
  const d = DAY.format(new Date(iso))
  return d.charAt(0).toUpperCase() + d.slice(1)
}

/** Alla notiser som laget har skickat, senaste först. Bara för lagets admin. */
export default function PushLog() {
  const router = useRouter()
  if (getMe()?.current?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Notisloggen är bara för lagets admin.</p>
        <button onClick={() => router.back()} className="text-sm font-medium text-primary">Tillbaka</button>
      </div>
    )
  }
  return <PushLogPage />
}

function PushLogPage() {
  const log = useGetPushLog()
  const [rows, setRows] = useState<PushLogRow[] | null>(null)
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [audience, setAudience] = useState<'all' | PushLogRow['audience']>('all')
  const [adminOnly, setAdminOnly] = useState<boolean | null>(null)
  const toggle = useSetPushAdminOnly()

  async function load(before?: string) {
    setError(null)
    try {
      const r = await log.trigger({ before: before ?? null, limit: 50 }, { skipCache: true })
      setRows((prev) => (before && prev ? [...prev, ...r.rows] : r.rows))
      setMore(r.more)
      setAdminOnly(r.adminOnly)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta notisloggen.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (rows ?? []).filter((r) =>
      (audience === 'all' || r.audience === audience) &&
      (!q || `${r.title} ${r.body ?? ''} ${r.sentByName ?? ''}`.toLowerCase().includes(q)))
  }, [rows, search, audience])

  const days = useMemo(() => {
    const out: { key: string; label: string; rows: PushLogRow[] }[] = []
    for (const r of shown) {
      const k = dayKey(r.createdAt)
      if (out[out.length - 1]?.key !== k) out.push({ key: k, label: dayLabel(r.createdAt), rows: [] })
      out[out.length - 1].rows.push(r)
    }
    return out
  }, [shown])

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-4 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center gap-3">
          <SquadLogo />
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Notislogg</h1>
            <p className="text-sm text-team-accent/70">Alla notiser som laget har skickat</p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3 md:p-4">
        {adminOnly !== null && (
          <div className={cn('flex items-start gap-3 rounded-xl border p-3',
            adminOnly ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40' : 'border-border bg-card')}>
            <FlaskConical className={cn('mt-0.5 h-5 w-5 shrink-0', adminOnly ? 'text-amber-600' : 'text-muted-foreground')} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Testläge för notiser{adminOnly ? ' är på' : ''}</p>
              <p className="text-sm text-muted-foreground">
                {adminOnly
                  ? 'Alla lagets notiser går bara till lagets admin, även för dina egna ändringar. Ledare, spelare och anhöriga får inga notiser. Kom ihåg att stänga av när du testat klart.'
                  : 'Skicka lagets notiser bara till lagets admin, även för dina egna ändringar, så att du kan testa utan att ledare, spelare och anhöriga får dem.'}
              </p>
            </div>
            <button type="button" role="switch" aria-checked={adminOnly} aria-label="Testläge för notiser" disabled={toggle.loading}
              onClick={async () => {
                setError(null)
                try { setAdminOnly((await toggle.trigger({ on: !adminOnly })).adminOnly) }
                catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte ändra testläget.') }
              }}
              className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50', adminOnly ? 'bg-amber-500' : 'bg-muted-foreground/30')}>
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', adminOnly ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök i notiserna"
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm" />
          </label>
          <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} aria-label="Mottagare"
            className="h-9 rounded-md border border-border bg-background px-2 text-sm">
            <option value="all">Alla mottagare</option>
            <option value="squad">Alla som följer laget</option>
            <option value="leaders">Ledare</option>
            <option value="admins">Admin</option>
          </select>
        </div>

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!rows ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">Inga notiser är skickade sedan loggen startade. Nya notiser hamnar här.</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Inga notiser matchar sökningen.</p>
        ) : (
          days.map((d) => (
            <section key={d.key} className="flex flex-col gap-1.5">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d.label}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {d.rows.map((r) => <LogItem key={r.id} r={r} />)}
              </ul>
            </section>
          ))
        )}
        {more && rows && (
          <button type="button" onClick={() => load(rows[rows.length - 1].createdAt)} disabled={log.loading}
            className="mx-auto flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
            {log.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />} Visa äldre
          </button>
        )}
      </div>
    </div>
  )
}

function LogItem({ r }: { r: PushLogRow }) {
  // Notisens länk innehåller lagets id (/-/…?lag=N); i appen räcker sökvägen
  const href = r.url ? r.url.replace(/^\/-/, '').replace(/[?&]lag=\d+/, '') || null : null
  const reached = r.people === 0
    ? 'Ingen fick den (ingen med notiser påslagna)'
    : `${r.people} ${r.people === 1 ? 'person' : 'personer'} · ${r.devices} ${r.devices === 1 ? 'enhet' : 'enheter'}`
  const content = (
    <div className="flex gap-3 px-3 py-2.5">
      <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{TIME.format(new Date(r.createdAt))}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{r.title}</p>
        {r.body && <p className="whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>}
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {r.testMode && <span className="rounded bg-amber-100 px-1.5 py-px font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">Testläge: bara admin</span>}
          <span className={cn('rounded bg-muted px-1.5 py-px font-medium text-foreground/80', r.testMode && 'line-through opacity-60')}>{AUDIENCE[r.audience]}</span>
          <span className={cn(r.people === 0 && 'text-amber-700 dark:text-amber-400')}>{reached}</span>
          {r.failed > 0 && <span className="text-destructive">{r.failed} misslyckades</span>}
          {r.sentByName && <span>· av {r.sentByName}</span>}
        </p>
      </div>
    </div>
  )
  return <li>{href ? <Link href={href} className="block hover:bg-muted/40">{content}</Link> : content}</li>
}
