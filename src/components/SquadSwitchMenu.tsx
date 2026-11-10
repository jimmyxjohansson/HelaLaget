'use client'

import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../lib/shadcn/dropdown-menu'
import { getMe } from '../lib/squad-store'
import { setSquadCookie } from '../lib/squad-cookie'

/** Lagen man kan byta till (godkända medlemskap). */
export function switchableSquads() {
  return getMe()?.memberships.filter((m) => m.status === 'approved') ?? []
}

/** Flyout med lagen. Valt lag har en bock; ett annat lag öppnas direkt. */
export default function SquadSwitchMenu({ children, side = 'bottom', align = 'end', onSwitch }: {
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  onSwitch?: () => void
}) {
  const squads = switchableSquads()
  const current = getMe()?.current?.squadId

  function open(squadId: number) {
    if (squadId === current) return
    onSwitch?.()
    setSquadCookie(squadId)
    window.location.href = '/'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="z-[60] w-60">
        <DropdownMenuLabel>Byt lag</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {squads.map((m) => (
          <DropdownMenuItem key={m.squadId} onSelect={() => open(m.squadId)} className="flex cursor-pointer items-center gap-2.5">
            <span className="h-6 w-2 shrink-0 rounded-sm" style={{ backgroundColor: m.primaryColor }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-muted-foreground">{m.organizationName}</span>
              <span className="block truncate font-medium">{m.squadName}</span>
            </span>
            {m.squadId === current && <Check className="h-4 w-4 shrink-0" aria-label="Valt lag" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
