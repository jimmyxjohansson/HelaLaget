import { currentSquad } from '../lib/squad-store'

// Neutral Hela Laget-logga för lag som inte har lagt in en egen (Admin → Medlemmar).
const FALLBACK_LOGO = '/icons/icon-192.png'

/** Valt lags logga, som visas i matchvyerna. */
export function ownTeamLogoUrl(): string {
  return currentSquad()?.logoUrl || FALLBACK_LOGO
}

/** Valt lags förening, t.ex. "Skabersjö IF". */
export function ownTeamName(): string {
  return currentSquad()?.organizationName ?? ''
}
