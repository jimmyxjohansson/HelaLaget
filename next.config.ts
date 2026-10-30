import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // pg är ett Node-paket som inte ska bundlas in i serverkoden.
  serverExternalPackages: ['pg'],
  images: {
    // Bilder visas med vanliga <img>-taggar, så Next bildoptimering används inte.
    unoptimized: true,
  },
}

export default nextConfig
