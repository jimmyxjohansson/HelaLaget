/** Den inloggade användaren, skickas till varje backend-funktion som req.user. */
export type User = {
  id: string
  email: string | null
}

export type BackendRequest<P> = { params: P; user: User }
