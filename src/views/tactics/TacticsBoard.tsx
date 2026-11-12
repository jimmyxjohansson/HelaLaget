'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ExternalLink, Maximize, Minimize, X } from 'lucide-react'
import SquadLogo from '../../components/SquadLogo'
import { canEdit, currentSquad } from '../../lib/squad-store'
import LeadersOnly from '../../components/LeadersOnly'
import { BOARD_HTML } from './boardHtml'

/** Ljust läge för tavlan; planen är grön i båda lägena. Växlas med data-theme på <html>. */
const LIGHT_CSS = `<style>
html[data-theme=light]{--bg:#f7f8f7;--panel:#ffffff;--line:#e3e8e4;--text:#111827;--muted:#5d6b62;--cover:#d99a0b}
html[data-theme=light] .presets button:not(.on),html[data-theme=light] .stat{background:#f1f4f2}
html[data-theme=light] .presets button:not(.on):hover{border-color:#a8bcae}
</style>
<script>addEventListener('message',function(e){if(e.data&&e.data.hlTheme)document.documentElement.setAttribute('data-theme',e.data.hlTheme)})</script>`

const appTheme = () => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')

/** Mörkare variant av en färg, för tröjnumren. */
function darker(hex: string, f = 0.55) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#14532d'
  const n = parseInt(m[1], 16)
  const c = (s: number) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0')
  return `#${c(16)}${c(8)}${c(0)}`
}

/** Taktiktavlan: zonförsvar och anfall i 9 mot 9 och 11 mot 11, i lagets färger. */
export default function TacticsBoard() {
  // Bara för ledare, som Övningsbanken
  if (!canEdit()) return <LeadersOnly what="Taktiktavlan" />
  if (!currentSquad()?.tacticsBoard) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Taktiktavlan är inte påslagen för laget. Lagets admin slår på den under Laginställningar.</p>
      </div>
    )
  }
  return <Board />
}

function Board() {
  const squad = currentSquad()
  const frame = useRef<HTMLIFrameElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  // ?helskarm=1: bara tavlan, över hela fönstret (öppnas i en egen flik)
  const alone = useSearchParams()?.get('helskarm') === '1'
  const [isFull, setIsFull] = useState(false)
  // Helskärm finns inte i alla webbläsare (t.ex. Safari på iPhone)
  const [canFull, setCanFull] = useState(false)
  useEffect(() => {
    setCanFull(!!document.fullscreenEnabled)
    const on = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else box.current?.requestFullscreen?.().catch(() => {})
  }
  function openTab() {
    window.open(`${window.location.pathname}?helskarm=1`, '_blank', 'noopener')
  }
  const btn = 'flex h-9 items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 text-sm font-medium hover:bg-primary-foreground/30'
  // Följ appens ljusa/mörka läge; byte skickas till tavlan så att uppställningen ligger kvar
  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({ hlTheme: appTheme() }, '*')
    const observer = new MutationObserver(send)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  const srcDoc = useMemo(() => {
    // Vårt lag spelar i lagets färger: tröja i textfärgen, byxor i huvudfärgen
    const shirt = squad?.accentColor || '#ffd21f'
    const shorts = squad?.primaryColor || '#1e7a3c'
    return BOARD_HTML
      .replaceAll('__US_SHIRT__', shirt)
      .replaceAll('__US_SHORTS__', shorts)
      .replaceAll('__US_NUM__', darker(shorts))
      .replace('<html lang="sv">', `<html lang="sv" data-theme="${appTheme()}">`)
      .replace('</head>', `${LIGHT_CSS}</head>`)
  }, [squad?.accentColor, squad?.primaryColor])

  const iframe = <iframe ref={frame} title="Taktiktavla" srcDoc={srcDoc} sandbox="allow-scripts" className="min-h-0 w-full flex-1 border-0 bg-background" />

  if (alone) {
    // Egen flik: tavlan täcker menyerna, med knappar för helskärm och stäng
    return (
      <div ref={box} className="fixed inset-0 z-[100] flex flex-col bg-background">
        <div className="flex items-center gap-2 px-3 py-2 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
          <SquadLogo className="h-7 w-7" />
          <span className="min-w-0 flex-1 truncate font-bold">Taktiktavla · {squad?.squadName}</span>
          {canFull && (
            <button type="button" onClick={toggleFull} className={btn} title={isFull ? 'Avsluta helskärm' : 'Helskärm'}>
              {isFull ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFull ? 'Avsluta helskärm' : 'Helskärm'}</span>
            </button>
          )}
          <button type="button" onClick={() => window.close()} className={btn} title="Stäng fliken" aria-label="Stäng fliken">
            <X className="h-4 w-4" />
          </button>
        </div>
        {iframe}
      </div>
    )
  }

  return (
    <div ref={box} className="flex h-[calc(100dvh-4rem)] flex-col bg-background md:h-dvh">
      <div className="flex items-center gap-3 px-4 pb-3 pt-6 text-team-accent" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <SquadLogo />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Taktiktavla</h1>
          <p className="text-sm text-team-accent/70">Försvar och anfall i 9 mot 9 och 11 mot 11</p>
        </div>
        <button type="button" onClick={openTab} className={btn} title="Öppna i en egen flik som tar upp hela fönstret">
          <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Egen flik</span>
        </button>
        {canFull && (
          <button type="button" onClick={toggleFull} className={btn} title={isFull ? 'Avsluta helskärm' : 'Helskärm'} aria-label="Helskärm">
            {isFull ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        )}
      </div>
      {iframe}
    </div>
  )
}
