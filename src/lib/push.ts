'use client'

/** Hjälpfunktioner för push-notiser i webbläsaren. */

export type PushSupport =
  | 'supported'
  /** iPhone/iPad i Safari: appen måste läggas på hemskärmen först. */
  | 'ios-needs-install'
  /** iOS äldre än 16.4 eller en webbläsare utan Web Push. */
  | 'unsupported'

export function isIos() {
  if (typeof navigator === 'undefined') return false
  // iPadOS 13+ utger sig för att vara en Mac, men har pekskärm
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIos() && !isStandalone()) return 'ios-needs-install'
  return hasApis ? 'supported' : 'unsupported'
}

/** Registrerar service workern (görs när appen startar). */
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
    console.warn('[push] kunde inte registrera service worker', e)
  })
}

async function registration() {
  await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  return navigator.serviceWorker.ready
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'supported') return null
  const reg = await registration()
  return reg.pushManager.getSubscription()
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/**
 * Be om tillåtelse och skapa en prenumeration. Måste anropas direkt från ett
 * knapptryck (krav i iOS).
 */
export async function subscribe(publicKey: string): Promise<PushSubscription> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notiser är blockerade för Hela Laget. Tillåt dem i telefonens inställningar och försök igen.'
        : 'Du behöver tillåta notiser för att få dem.',
    )
  }
  const reg = await registration()
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  })
}
