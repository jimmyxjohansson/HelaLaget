'use client'

import {
  BarChart3, Bell, BellRing, BookOpen, Building2, CalendarDays, CalendarRange, ExternalLink, FileText, Home, ListOrdered,
  LayoutTemplate, Medal, Presentation, RefreshCw, Repeat, Shield, Trophy, UserCog, Users, UsersRound as Users2,
} from 'lucide-react'
import { getMe } from '../lib/squad-store'
import { isActivePath } from '../lib/navigation'

export type NavItem = {
  to: string
  icon: typeof Bell
  label: string
  external?: boolean
  /** Ingen länk: öppnar lagväxlaren (flyout) */
  switchSquad?: boolean
}
export type NavGroup = { title: string; items: NavItem[] }

/** Huvudflikarna. Första fliken heter som laget (t.ex. P-13). */
export function mainItems(): NavItem[] {
  const squad = getMe()?.current
  return [
    { to: '/', icon: Home, label: squad?.squadName ?? 'Hem' },
    { to: '/trainings', icon: CalendarDays, label: 'Träningar' },
    { to: '/matches', icon: Trophy, label: 'Matcher' },
    { to: '/cups', icon: Medal, label: 'Cuper' },
  ]
}

/** Övriga sidor i grupper, beroende på roll i valt lag. Tomma grupper tas bort. */
export function navGroups(): NavGroup[] {
  const me = getMe()
  const role = me?.current?.role
  const leader = role === 'leader' || role === 'admin'

  const laget: NavItem[] = []
  if (leader) laget.push({ to: '/planering', icon: CalendarRange, label: 'Planering' })
  laget.push(
    { to: '/players', icon: Users, label: 'Spelare' },
    { to: '/statistik', icon: BarChart3, label: 'Statistik' },
  )
  // Övningsbanken är för ledare; Spelare och Anhörig ser övningarna i träningsplanen
  if (role !== 'viewer') {
    laget.push({ to: '/ovningar', icon: BookOpen, label: 'Övningsbank' })
    if (leader) laget.push({ to: '/ovningar/mallar', icon: LayoutTemplate, label: 'Träningsplansmallar' })
  }
  if (leader) laget.push({ to: '/taktiktavla', icon: Presentation, label: 'Taktiktavla' })

  const tavling: NavItem[] = [
    { to: '/serier', icon: ListOrdered, label: 'Serier' },
    { to: '/teams', icon: Shield, label: 'Lag' },
  ]

  // Lagets egna länkar, med namnen admin har gett dem
  const lankar: NavItem[] = []
  // Spelare och Anhörig ser inte lagets länkar (servern skickar dem inte heller)
  if (role !== 'viewer' && me?.current?.siteUrl) {
    lankar.push({ to: me.current.siteUrl, icon: ExternalLink, label: me.current.siteName || 'Lagets sida', external: true })
  }
  if (role !== 'viewer' && me?.current?.docsUrl) {
    lankar.push({ to: me.current.docsUrl, icon: FileText, label: me.current.docsName || 'Dokument', external: true })
  }

  const konto: NavItem[] = []
  // Byt lag bara för den som är med i flera lag
  if ((me?.memberships.filter((m) => m.status === 'approved').length ?? 0) > 1) {
    konto.push({ to: '#byt-lag', icon: Repeat, label: 'Byt lag', switchSquad: true })
  }
  konto.push(
    { to: '/lag', icon: Users2, label: 'Mina lag' },
    { to: '/notiser', icon: Bell, label: 'Notiser' },
  )

  const admin: NavItem[] = []
  if (leader) admin.push({ to: '/svenskalag', icon: RefreshCw, label: 'Svenskalag-synk' })
  if (role === 'admin') {
    admin.push({ to: '/lag/installningar', icon: UserCog, label: 'Laginställningar' })
    admin.push({ to: '/lag/notislogg', icon: BellRing, label: 'Notislogg' })
  }
  if (me?.isSuperadmin || (me?.adminOrganizationIds.length ?? 0) > 0) {
    admin.push({ to: '/foreningar', icon: Building2, label: 'Föreningar' })
  }

  return [
    { title: 'Laget', items: laget },
    { title: 'Tävling', items: tavling },
    { title: 'Länkar', items: lankar },
    { title: 'Mitt konto', items: konto },
    { title: 'Administration', items: admin },
  ].filter((g) => g.items.length > 0)
}

/** Är sidan aktiv? '/lag' ska inte lysa på '/lag/installningar'. */
export function isItemActive(pathname: string, item: NavItem, all: NavItem[]) {
  if (item.external || item.switchSquad || !isActivePath(pathname, item.to)) return false
  // En längre, mer specifik länk som också matchar vinner
  return !all.some((o) => o !== item && !o.external && !o.switchSquad && o.to.length > item.to.length && isActivePath(pathname, o.to))
}
