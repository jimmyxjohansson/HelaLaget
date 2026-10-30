import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // pg och web-push är Node-paket som inte ska bundlas in i serverkoden.
  serverExternalPackages: ['pg', 'web-push'],
  images: {
    // Bilder visas med vanliga <img>-taggar, så Next bildoptimering används inte.
    unoptimized: true,
  },
  // Service workern (push-notiser) ska alltid hämtas på nytt, så att uppdateringar når ut direkt.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]
  },
}

export default nextConfig
