// Bro mellan Hela Laget-sidan och tillägget. Körs bara på Hela Lagets adresser.
(() => {
  const host = location.hostname
  if (!(host === 'hela-laget.vercel.app' || /^hela-laget-[a-z0-9-]+\.vercel\.app$/.test(host))) return

  const VERSION = chrome.runtime.getManifest().version
  // Sidan ser att tillägget finns
  document.documentElement.dataset.hlSvenskalag = VERSION
  window.postMessage({ type: 'HL_SVL_READY', version: VERSION }, location.origin)

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.origin !== location.origin) return
    const msg = e.data
    if (!msg || msg.type !== 'HL_SVL_FETCH' || typeof msg.url !== 'string') return
    chrome.runtime.sendMessage({ type: 'fetch', url: msg.url }, (res) => {
      const err = chrome.runtime.lastError
      window.postMessage(
        { type: 'HL_SVL_RESULT', id: msg.id, ...(err ? { error: err.message } : res) },
        location.origin,
      )
    })
  })
})()
