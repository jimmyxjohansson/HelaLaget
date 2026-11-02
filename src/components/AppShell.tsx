'use client'

import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation'
import { setCurrentSlug, slugFromPath, stripTeam, ANY_SQUAD } from '../lib/nav'
import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import MobileShell from './MobileShell'
import { callBackend } from '../hooks/backend/_core'
import { getMe, hexToRgbChannels, setMe, type Me } from '../lib/squad-store'
import { getTabSquad, readSquadCookie, setSquadCookie, setTabSquad, SQUAD_PARAM, squadParamFromUrl, squadSlug } from '../lib/squad-cookie'
import { registerServiceWorker } from '../lib/push'
import { Button } from '../lib/shadcn/button'

const subscribe = () => () => {}

/** Sidor som fungerar utan valt lag. */
const ACCOUNT_PAGES = ['/lag', '/foreningar', '/join', '/notiser']

/**
 * Laddar inloggad användare och valt lag innan vyerna visas, sätter lagets
 * färger och skickar den som inte är med i något lag till /lag.
 *
 * Vyerna från Retool läser localStorage redan vid första renderingen och
 * renderas därför bara i webbläsaren, precis som i Retool.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  // Adressen som den står, med lagets namn först (t.ex. /skabersjo-if-p-13/matches)
  const rawPathname = useNextPathname() ?? '/'
  const pathname = stripTeam(rawPathname)
  const router = useNextRouter()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    registerServiceWorker()
    // Laget väljs i ordningen: lagets namn först i adressen
    // (/skabersjo-if-p-13/matches), ?lag=<nummer> i äldre notislänkar,
    // flikens eget lag, senast valt lag.
    const pathSlug = slugFromPath(window.location.pathname)
    const queryParam = squadParamFromUrl()
    const param = pathSlug && pathSlug !== ANY_SQUAD ? pathSlug : queryParam
    const numeric = param && /^\d+$/.test(param) ? Number(param) : null
    let fromLink = numeric
    callBackend<Me>('account/getMe', { squadId: numeric ?? getTabSquad() ?? readSquadCookie() })
      .then(async (first) => {
        let me = first
        // Lagnamn i adressen: leta upp laget bland användarens lag
        if (param && !numeric) {
          const match = me.memberships.find((m) => m.status === 'approved' && squadSlug(m, me.memberships) === param)
          if (match) {
            fromLink = match.squadId
            if (match.squadId !== me.current?.squadId) me = await callBackend<Me>('account/getMe', { squadId: match.squadId })
          }
        }
        return me
      })
      .then((me) => {
        if (cancelled) return
        setMe(me)
        if (me.current) {
          setCurrentSlug(squadSlug(me.current, me.memberships))
          setTabSquad(me.current.squadId)
          // Ett lag valt via länk blir också standard för nya flikar
          if (fromLink === me.current.squadId || !readSquadCookie()) setSquadCookie(me.current.squadId)
          const root = document.documentElement.style
          const primary = hexToRgbChannels(me.current.primaryColor)
          const accent = hexToRgbChannels(me.current.accentColor)
          if (primary) root.setProperty('--team-primary', primary)
          if (accent) root.setProperty('--team-accent', accent)
        }
        setState('ready')
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
        setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [mounted])

  const isAccountPage = ACCOUNT_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const me = state === 'ready' ? getMe() : null
  const needsSquad = state === 'ready' && !me?.current && !isAccountPage

  useEffect(() => {
    if (needsSquad) router.replace('/lag')
  }, [needsSquad, router])

  // Lagets namn står först i adressen. Saknas det (startsidan, gamla länkar
  // via /-/…) eller är det ett annat lag skrivs adressen om till flikens lag.
  const slug = me?.current ? squadSlug(me.current, me.memberships) : null
  useEffect(() => {
    if (!slug) return
    const onTeamPage = !ACCOUNT_PAGES.some((p) => rawPathname === p || rawPathname.startsWith(`${p}/`))
    if (!onTeamPage) return
    const url = new URL(window.location.href)
    const hadParam = url.searchParams.has(SQUAD_PARAM)
    url.searchParams.delete(SQUAD_PARAM)
    if (slugFromPath(rawPathname) === slug && !hadParam) return
    const rest = stripTeam(rawPathname)
    router.replace(`/${slug}${rest === '/' ? '' : rest}${url.search}${url.hash}`)
  }, [slug, rawPathname, router])

  // Fliknamn: "Skabersjö IF P-13 – Hela Laget". Next sätter tillbaka titeln
  // från layouten vid varje sidbyte, så den skrivs över igen när den ändras.
  const tabTitle = me?.current ? `${me.current.organizationName} ${me.current.squadName} – Hela Laget` : null
  useEffect(() => {
    if (!tabTitle) return
    const apply = () => {
      if (document.title !== tabTitle) document.title = tabTitle
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, { subtree: true, childList: true, characterData: true })
    return () => observer.disconnect()
  }, [tabTitle, pathname])

  if (!mounted || state === 'loading' || needsSquad) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-muted flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Kunde inte ladda appen: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Försök igen
        </Button>
      </div>
    )
  }

  // Utan valt lag (t.ex. ny användare på /lag): ingen meny, bara innehållet.
  if (!me?.current) {
    return (
      <div className="min-h-screen bg-muted flex justify-center">
        <div className="w-full max-w-[430px] md:max-w-[640px] bg-background min-h-screen">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    )
  }

  return (
    <MobileShell>
      <Suspense fallback={null}>{children}</Suspense>
    </MobileShell>
  )
}
