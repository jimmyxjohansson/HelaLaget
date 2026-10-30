// Hela Lagets service worker. Används bara för push-notiser; inget cachas,
// så appen beter sig precis som förut.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Hela Laget', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Hela Laget'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || undefined,
      // Ny notis med samma tagg (samma match) ska ändå plinga
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          try {
            await client.focus()
            if ('navigate' in client) return await client.navigate(url)
            return
          } catch {
            break
          }
        }
      }
      return self.clients.openWindow(url)
    })(),
  )
})
