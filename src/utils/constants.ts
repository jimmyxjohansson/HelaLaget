import { currentSquad } from '../lib/squad-store'

// Logga som används om laget inte har en egen (Lagets inställningar).
const FALLBACK_LOGO = process.env.NEXT_PUBLIC_OWN_TEAM_LOGO_URL || '/icons/icon-192.png'

/** Valt lags logga, som visas i matchvyerna. */
export function ownTeamLogoUrl(): string {
  return currentSquad()?.logoUrl || FALLBACK_LOGO
}

/** Valt lags förening, t.ex. "Skabersjö IF". */
export function ownTeamName(): string {
  return currentSquad()?.organizationName ?? ''
}
