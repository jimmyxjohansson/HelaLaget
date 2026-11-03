'use client'

import { useEffect, useState } from 'react'
import { CloudDownload, Loader2 } from 'lucide-react'
import { useRouter } from '../../lib/nav'
import { useSyncSvenskalagReplies } from '../../hooks/backend/replies'

export const STORE_KEY = 'hl_svenskalag_svar'

/** Sant när webbläsartillägget "Hela Laget – Svenskalag-synk" är installerat. */
export function useSvenskalagExtension() {
  const [has, setHas] = useState(false)
  useEffect(() => {
    if (document.documentElement.dataset.hlSvenskalag) setHas(true)
    const on = (e: MessageEvent) => {
      if (e.source === window && e.data?.type === 'HL_SVL_READY') setHas(true)
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])
  return has
}

/** Ber tillägget läsa svaren på aktiviteten i Svenskalag, med användarens egen inloggning där. */
export function fetchReplies(url: string): Promise<unknown> {
  // Matcher länkas som /match/<nr>/… men Svenskalag skickar /aktivitet/<nr> vidare
  // till samma sida, och det är den formen tillägget känner igen.
  url = url.replace(/\/match\/(\d+)(?:\/[^?#]*)?/, '/aktivitet/$1')
  const id = Math.random().toString(36).slice(2)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { window.removeEventListener('message', on); reject(new Error('Svenskalag svarade inte. Försök igen.')) }, 45000)
    function on(e: MessageEvent) {
      if (e.source !== window || e.data?.type !== 'HL_SVL_RESULT' || e.data.id !== id) return
      clearTimeout(timer)
      window.removeEventListener('message', on)
      if (e.data.error) reject(new Error(e.data.error))
      else resolve(e.data.payload)
    }
    window.addEventListener('message', on)
    window.postMessage({ type: 'HL_SVL_FETCH', id, url }, window.location.origin)
  })
}

export type SyncStatus = { ok: boolean; text: string; unknown?: string[]; payload?: unknown }

/**
 * Knappen Synka svar på en träning, match eller cup. Visas bara när tillägget finns.
 * Svaren hämtas och sparas direkt, och resultatet rapporteras via onStatus.
 */
export default function SyncRepliesButton({ kind, id, url, className, onStatus, onSynced }: {
  kind: 'training' | 'match' | 'cup'
  id: number
  url: string
  className?: string
  onStatus: (status: SyncStatus | null) => void
  onSynced?: () => void
}) {
  const has = useSvenskalagExtension()
  const syncReplies = useSyncSvenskalagReplies()
  const [busy, setBusy] = useState(false)
  if (!has) return null

  async function sync() {
    setBusy(true)
    onStatus(null)
    try {
      const payload = (await fetchReplies(url)) as { lists: Parameters<typeof syncReplies.trigger>[0]['lists'] }
      const res = await syncReplies.trigger({ kind, id, lists: payload.lists })
      onStatus({
        ok: true,
        text: `${res.saved} svar sparade${res.changed ? `, ${res.changed} ändrade` : ''}`,
        unknown: res.unknown,
        payload,
      })
      onSynced?.()
    } catch (e) {
      onStatus({ ok: false, text: e instanceof Error ? e.message : 'Kunde inte hämta svaren.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={sync} disabled={busy} className={className} aria-label="Synka svar från Svenskalag" title="Synka svar från Svenskalag">
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
    </button>
  )
}

/** Statusraden efter en synk. Okända namn kopplas på sidan Svar från Svenskalag. */
export function SyncStatusLine({ status, className, onDismiss }: { status: SyncStatus | null; className?: string; onDismiss?: () => void }) {
  const router = useRouter()
  if (!status) return null
  const unknown = status.unknown ?? []

  function openUnknown() {
    if (!status?.payload) return
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(status.payload))
    } catch {
      return
    }
    router.push('/svenskalag/svar')
  }

  return (
    <p className={className}>
      {status.ok ? '✓ ' : ''}{status.text}
      {unknown.length > 0 && (
        <>
          {' · '}
          <button type="button" onClick={openUnknown} className="font-medium underline underline-offset-2">
            {unknown.length === 1 ? '1 okänt namn' : `${unknown.length} okända namn`} – koppla
          </button>
        </>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Stäng" className="ml-2 opacity-70 hover:opacity-100">✕</button>
      )}
    </p>
  )
}
