'use client'

import { Building2, Repeat, UserCog } from 'lucide-react'
import { getMe } from '../lib/squad-store'

/** Länkar för konto och administration, beroende på roll i valt lag. */
export function accountLinks() {
  const me = getMe()
  const links = [{ to: '/lag', icon: Repeat, label: 'Mina lag' }]
  if (me?.current?.role === 'admin') links.push({ to: '/lag/installningar', icon: UserCog, label: 'Medlemmar' })
  if (me?.isSuperadmin || (me?.adminOrganizationIds.length ?? 0) > 0) {
    links.push({ to: '/foreningar', icon: Building2, label: 'Föreningar' })
  }
  return links
}
