'use client'

import { useCallback, useRef, useState } from 'react'

type TriggerOptions = {
  /** Fanns i Retool. Vi cachar aldrig, så flaggan behövs inte men accepteras. */
  skipCache?: boolean
}

// Parametrarna är lika tillåtande som i Retools krokar (vyerna skickar ibland
// generiska objekt). Saknade fält blir NULL i SQL-frågorna.
type LooseParams<P> = Partial<P> | Record<string, unknown>

type TriggerArgs<P> = Record<string, never> extends P
  ? [params?: LooseParams<P>, options?: TriggerOptions]
  : [params: LooseParams<P>, options?: TriggerOptions]

export class BackendError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'BackendError'
  }
}

/** Anropar en backend-funktion via /api/<modul>/<funktion>. */
export async function callBackend<R>(name: string, params: unknown): Promise<R> {
  const res = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params ?? {}),
  })

  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
    throw new BackendError('Du är inte inloggad.', 401)
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body && typeof body.error === 'string' ? body.error : `Något gick fel (${res.status}).`
    throw new BackendError(message, res.status)
  }
  return body as R
}

/**
 * Skapar en krok med samma form som Retools genererade krokar:
 * `const { data, loading, error, trigger } = useX()`, där `trigger(params)`
 * returnerar resultatet och kastar vid fel.
 */
export function createBackendHook<P, R>(name: string, run?: (params: P) => Promise<R>) {
  return function useBackend() {
    const [data, setData] = useState<R | undefined>(undefined)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const latestCall = useRef(0)

    const trigger = useCallback(async (...args: TriggerArgs<P>): Promise<R> => {
      const params = (args[0] ?? {}) as P
      const callId = ++latestCall.current
      setLoading(true)
      setError(null)
      try {
        const result = run ? await run(params) : await callBackend<R>(name, params)
        // Bara det senaste anropet får uppdatera data, så att ett långsamt
        // äldre svar inte skriver över ett nyare (t.ex. vid snabba filterbyten).
        if (callId === latestCall.current) setData(result)
        return result
      } catch (e) {
        if (callId === latestCall.current) setError(e as Error)
        throw e
      } finally {
        if (callId === latestCall.current) setLoading(false)
      }
    }, [])

    return { data, loading, error, trigger }
  }
}
