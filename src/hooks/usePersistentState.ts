import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Like useState, but persists the value to localStorage under `key` so it
 * survives navigation and reloads. Falls back to `initial` when nothing is
 * stored or storage is unavailable.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw) as T
    } catch {
      // ignore malformed / unavailable storage
    }
    return initial
  })

  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(value))
    } catch {
      // ignore quota / unavailable storage
    }
  }, [value])

  return [value, setValue]
}
