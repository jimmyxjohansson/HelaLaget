'use client'

import { useEffect } from 'react'
import { useGetSquadStatuses } from './backend/players'

/**
 * Statusar som finns i laget. Returnerar en funktion som säger om ett
 * statusfilter ska visas: alla visas tills svaret har kommit.
 */
export function useSquadStatuses() {
  const { data, trigger } = useGetSquadStatuses()
  useEffect(() => {
    trigger().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const present = data ? new Set(data.filter((r) => r.count > 0).map((r) => r.status)) : null
  return (status: string) => !present || present.has(status)
}
