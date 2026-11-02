import 'server-only'

/** Landskoder för fältet Land på lagen (fritext som "Sverige" eller "SE"). */
const COUNTRY_CODES: Record<string, string> = {
  se: 'se', sverige: 'se', sweden: 'se',
  dk: 'dk', danmark: 'dk', denmark: 'dk',
  no: 'no', norge: 'no', norway: 'no',
  fi: 'fi', finland: 'fi',
  de: 'de', tyskland: 'de', germany: 'de',
  es: 'es', spanien: 'es', spain: 'es',
  nl: 'nl', nederländerna: 'nl', holland: 'nl',
  pl: 'pl', polen: 'pl', poland: 'pl',
  gb: 'gb', england: 'gb', storbritannien: 'gb',
}

/**
 * Koordinater för en ort via OpenStreetMap (Nominatim). Ger null om orten inte
 * hittas eller tjänsten inte svarar; laget sparas ändå, bara utan kartnål.
 */
export async function geocodeCity(city: string, country: string | null): Promise<{ lat: number; lng: number } | null> {
  const q = city.trim()
  if (!q) return null
  const cc = country ? COUNTRY_CODES[country.trim().toLowerCase()] : 'se'
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('accept-language', 'sv')
  if (cc) url.searchParams.set('countrycodes', cc)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HelaLaget/1.0 (https://hela-laget.vercel.app)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { lat: string; lon: string }[]
    if (!data[0]) return null
    const lat = Number(data[0].lat)
    const lng = Number(data[0].lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  } catch {
    return null
  }
}
