'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsUpDown, LogOut, Moon, Sun } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import { isActivePath, signOut } from '../lib/navigation'
import { getMe } from '../lib/squad-store'
import SquadLogo from './SquadLogo'
import { isItemActive, mainItems, navGroups } from './navItems'

type Theme = 'light' | 'dark'

interface Props {
  theme: Theme
  onToggleTheme: () => void
}

const row = 'flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-colors'
const idle = 'text-muted-foreground hover:text-foreground hover:bg-muted'
const on = 'bg-primary/10 text-primary'

export default function SideNav({ theme, onToggleTheme }: Props) {
  const pathname = usePathname() ?? '/'
  const me = getMe()
  const squad = me?.current
  const tabs = mainItems()
  // Lagväxlaren överst leder redan till Mina lag
  const groups = navGroups()
    .map((g) => ({ ...g, items: g.items.filter((i) => i.to !== '/lag') }))
    .filter((g) => g.items.length > 0)
  const all = groups.flatMap((g) => g.items)
  const subActive = all.some((i) => isItemActive(pathname, i, all))

  return (
    <nav className="hidden md:flex flex-col w-60 flex-shrink-0 bg-background border-r border-border sticky top-0 h-screen">
      {/* Lagväxlare */}
      <div className="px-3 pt-5 pb-3">
        {squad ? (
          <Link href="/lag" title="Byt lag" className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted">
            <SquadLogo className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{squad.organizationName}</p>
              <p className="truncate text-base font-bold leading-tight text-foreground">{squad.squadName}</p>
              {squad.role === 'viewer' && <p className="text-[11px] text-muted-foreground">Läsbehörighet</p>}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : (
          <h1 className="px-2 text-lg font-bold text-foreground">Hela Laget</h1>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
        {tabs.map(({ to, icon: Icon, label }) => (
          <Link key={to} href={to} className={cn(row, 'py-2', isActivePath(pathname, to) && !subActive ? on : idle)}>
            <Icon className="w-5 h-5" />
            <span className="truncate">{label}</span>
          </Link>
        ))}

        {groups.map((g) => (
          <div key={g.title} className="mt-3 flex flex-col gap-0.5">
            <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h3>
            {g.items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={cn(row, 'py-1.5', isItemActive(pathname, item, all) ? on : idle)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Konto */}
      <div className="border-t border-border px-3 py-3">
        {me?.user && (
          <p className="truncate px-3 pb-1 text-xs text-muted-foreground" title={me.user.email ?? undefined}>
            {me.user.name ?? me.user.email}
          </p>
        )}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
          className={cn(row, 'w-full py-1.5', idle)}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}</span>
        </button>
        <button type="button" onClick={signOut} className={cn(row, 'w-full py-1.5', idle)}>
          <LogOut className="w-4 h-4" />
          <span>Logga ut</span>
        </button>
      </div>
    </nav>
  )
}
