'use client'

import { Suspense, useSyncExternalStore, type ReactNode } from 'react'
import MobileShell from './MobileShell'

const subscribe = () => () => {}

/**
 * Vyerna från Retool läser localStorage (sparade filter, tema) redan när de
 * renderas första gången. De renderas därför bara i webbläsaren, precis som i
 * Retool, för att undvika hydreringsfel. Datan hämtas ändå från API:et efteråt.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  if (!mounted) return <div className="min-h-screen bg-muted" />

  return (
    <MobileShell>
      <Suspense fallback={null}>{children}</Suspense>
    </MobileShell>
  )
}
