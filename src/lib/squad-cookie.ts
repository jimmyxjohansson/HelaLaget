/** Cookie som håller valt lag. Läses av servern, sätts av lagväljaren. */
export const SQUAD_COOKIE = 'hl_squad'

export function setSquadCookie(squadId: number) {
  document.cookie = `${SQUAD_COOKIE}=${squadId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function readSquadCookie(): number | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SQUAD_COOKIE}=(\\d+)`))
  return match ? Number(match[1]) : null
}
