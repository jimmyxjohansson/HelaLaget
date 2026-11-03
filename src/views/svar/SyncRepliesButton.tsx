'use client'

import { useEffect, useState } from 'react'
import { CloudDownload, Loader2 } from 'lucide-react'
import { useRouter } from '../../lib/nav'

const STORE_KEY = 'hl_svenskalag_svar'

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
function fetchReplies(url: string): Promise<unknown> {
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

/**
 * Knappen Synka svar på en träning eller match. Visas bara när tillägget finns.
 * Svaren sparas och kvittensen visas på sidan Svar från Svenskalag.
 */
export default function SyncRepliesButton({ url, className, onError }: { url: string; className?: string; onError: (msg: string | null) => void }) {
  const has = useSvenskalagExtension()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (!has) return null

  async function sync() {
    setBusy(true)
    onError(null)
    try {
      const payload = await fetchReplies(url)
      try {
        sessionStorage.setItem(STORE_KEY, JSON.stringify(payload))
      } catch {
        throw new Error('Kunde inte spara svaren i webbläsaren.')
      }
      router.push('/svenskalag/svar')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Kunde inte hämta svaren.')
      setBusy(false)
    }
  }

  return (
    <button onClick={sync} disabled={busy} className={className} aria-label="Synka svar från Svenskalag" title="Synka svar från Svenskalag">
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
    </button>
  )
}
