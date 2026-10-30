import type { MetadataRoute } from 'next'

// Gör att appen kan installeras på hemskärmen (Android: "Installera app",
// iPhone: Dela → "Lägg till på hemskärmen") och öppnas i helskärm.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hela Laget',
    short_name: 'Hela Laget',
    description: 'Träningar, matcher och cuper för laget',
    lang: 'sv',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#106A37',
    theme_color: '#106A37',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
