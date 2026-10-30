'use client'

/**
 * I den installerade appen på Android öppnas länkar till andra webbplatser
 * (Svenskalag, Fogis, cupsidor …) annars i ett inbyggt webbläsarfönster inne i
 * appen. Här skickas de i stället till Chrome med en Android-intent. På iPhone,
 * datorn och i vanlig webbläsare ändras ingenting.
 */

function isAndroidApp() {
  if (typeof window === 'undefined') return false
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches
  return /Android/i.test(navigator.userAgent) && !!standalone
}

function externalUrl(href: string): URL | null {
  try {
    const url = new URL(href, window.location.href)
    if ((url.protocol === 'https:' || url.protocol === 'http:') && url.origin !== window.location.origin) return url
  } catch {
    // ogiltig länk
  }
  return null
}

/** intent://… som öppnar adressen i Chrome (eller adressen som den är om Chrome saknas). */
function chromeIntent(url: URL) {
  const scheme = url.protocol.replace(':', '')
  return (
    // Utan #fragment: det skulle krocka med #Intent (hela adressen finns i reservlänken)
    `intent://${url.host}${url.pathname}${url.search}` +
    `#Intent;scheme=${scheme};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(url.href)};end`
  )
}

/** Öppna en extern adress: i Chrome från Android-appen, annars i ny flik. */
export function openExternal(href: string) {
  const url = externalUrl(href)
  if (url && isAndroidApp()) {
    window.location.href = chromeIntent(url)
    return
  }
  window.open(href, '_blank', 'noopener,noreferrer')
}

let installed = false

/** Fångar klick på externa länkar i hela appen (anropas en gång när appen startar). */
export function installExternalLinkHandler() {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (!isAndroidApp()) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.hasAttribute('download')) return
      const url = externalUrl(a.getAttribute('href') ?? '')
      if (!url) return
      e.preventDefault()
      window.location.href = chromeIntent(url)
    },
    true,
  )
}
