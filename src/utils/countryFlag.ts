// Maps a country name (as stored in the teams table) to its ISO 3166-1
// alpha-2 code, used to render a flag emoji.
const COUNTRY_CODES: Record<string, string> = {
  Sverige: 'SE',
  Danmark: 'DK',
  Norge: 'NO',
  Finland: 'FI',
  England: 'GB',
  Kenya: 'KE',
  Tyskland: 'DE',
}

/** Returns a flag emoji for the given country name, or null if unknown. */
export function countryFlag(country: string | null | undefined): string | null {
  if (!country) return null
  const code = COUNTRY_CODES[country]
  if (!code) return null
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}
