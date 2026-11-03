// Öppnar aktiviteten på Svenskalag i en bakgrundsflik med din inloggning,
// läser listorna Kommer, Kan ej och Kallade och stänger fliken igen.

const ACTIVITY = /^https:\/\/(www\.)?svenskalag\.se\/[^?#]*\/(?:aktivitet|match)\/(\d+)/

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== 'fetch') return false
  readActivity(String(msg.url)).then(reply, (e) => reply({ error: e?.message || String(e) }))
  return true // svaret kommer senare
})

async function readActivity(url) {
  const m = url.match(ACTIVITY)
  if (!m) throw new Error('Länken går inte till en aktivitet på Svenskalag.')
  const tab = await chrome.tabs.create({ url: url.split('#')[0], active: false })
  try {
    await waitForLoad(tab.id)
    // Listorna kan byggas av sidans eget skript: vänta en kort stund på dem
    let result = null
    for (let i = 0; i < 10; i++) {
      const [{ result: r }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collect })
      result = r
      if (r.found || r.login) break
      await new Promise((ok) => setTimeout(ok, 500))
    }
    if (result.login) throw new Error('Du är inte inloggad på Svenskalag i den här webbläsaren. Logga in där och försök igen.')
    if (!result.found) throw new Error('Hittade inga svarslistor på aktiviteten. Är du ledare för laget på Svenskalag?')
    return { ok: true, payload: { v: 1, url: url.split('#')[0], activity: m[2], title: result.title, lists: result.lists } }
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {})
  }
}

function waitForLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(on); reject(new Error('Svenskalag svarade inte.')) }, 20000)
    function on(id, info) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer)
        chrome.tabs.onUpdated.removeListener(on)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(on)
  })
}

// Körs inne i Svenskalags sida. Samma inläsning som bokmärket.
function collect() {
  const PANES = { attending: ['tabYes', 'attending'], notattending: ['tabNo', 'notattending'], invited: ['tabNoAnswer', 'invited'] }
  const SKIP = '.visible-print,.reply-button,thead,script,style,button,option,.dropdown-menu'
  const pane = (ids) => ids.map((i) => document.getElementById(i)).find(Boolean) || null
  const segs = (el) => {
    const out = []
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let n
    while ((n = w.nextNode())) {
      const p = n.parentElement
      if (p && p.closest(SKIP)) continue
      const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim()
      if (t) out.push(t)
    }
    return out
  }
  const rows = (p) => {
    let r = Array.from(p.querySelectorAll('tr.reply-status'))
    if (!r.length) r = Array.from(p.querySelectorAll('tr,li,.list-group-item')).filter((e) => !e.closest('thead'))
    return r.map(segs).filter((s) => s.length > 0)
  }
  const lists = {}
  let found = false
  for (const k of Object.keys(PANES)) {
    const p = pane(PANES[k])
    lists[k] = p ? rows(p) : null
    if (p) found = true
  }
  const login = !found && !!document.querySelector('input[type=password]')
  return { found, login, lists, title: document.title }
}
