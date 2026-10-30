/** Den inloggade användaren, skickas till varje backend-funktion som req.user. */
export type User = {
  id: string
  email: string | null
}

export type SquadRole = 'viewer' | 'leader' | 'admin'

/** Användarens åtkomst till det valda laget. */
export type SquadAccess = {
  squadId: number
  organizationId: number
  role: SquadRole
}

/**
 * Vem som får anropa en backend-funktion. Anges i funktionsfilen med
 * `export const access = '...'`. Utan angivelse gäller: get* → 'viewer', övriga → 'leader'.
 *
 * - viewer/leader: körs i lagkontext (RLS) för valt lag och kräver minst den rollen
 * - admin:         kräver adminroll i valt lag; körs utan RLS (använd adminDb och req.squad)
 * - user:          vilken inloggad användare som helst; utan lag och utan RLS – funktionen
 *                  måste själv kontrollera behörighet
 * - superadmin:    bara superadmins; utan RLS
 */
export type Access = SquadRole | 'user' | 'superadmin'

export type BackendRequest<P> = { params: P; user: User; squad?: SquadAccess }

export const ROLE_RANK: Record<SquadRole, number> = { viewer: 1, leader: 2, admin: 3 }
