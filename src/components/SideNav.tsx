'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Home, CalendarDays, Users, Sun, Moon, Trophy, Medal, Shield, Settings, ChevronDown, ListOrdered, CalendarRange, LogOut, BarChart3 } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import { isActivePath, signOut } from '../lib/navigation'
import { currentSquad } from '../lib/squad-store'
import { accountLinks } from './accountLinks'


type Theme = 'light' | 'dark'

interface Props {
  theme: Theme
  onToggleTheme: () => void
}

const tabs = [
  { to: '/', icon: Home, label: 'Hem' },
  { to: '/trainings', icon: CalendarDays, label: 'Träningar' },
  { to: '/matches', icon: Trophy, label: 'Matcher' },
  { to: '/cups', icon: Medal, label: 'Cuper' },
]

const adminTabs = [
  { to: '/serier', icon: ListOrdered, label: 'Serier' },
  { to: '/players', icon: Users, label: 'Spelare' },
  { to: '/statistik', icon: BarChart3, label: 'Statistik' },
  { to: '/teams', icon: Shield, label: 'Lag' },
]

export default function SideNav({ theme, onToggleTheme }: Props) {
  const pathname = usePathname() ?? '/'
  const squad = currentSquad()
  const extraLinks = accountLinks()
  // Första fliken heter som laget (t.ex. P-13) i stället för Hem
  const homeTabs = tabs.map((t) => (t.to === '/' && squad ? { ...t, label: squad.squadName } : t))
  const adminActive = [...adminTabs, ...extraLinks.filter((l) => !l.external), { to: '/planering' }].some(t => pathname.startsWith(t.to))
  const [adminOpen, setAdminOpen] = useState(adminActive)

  return (
    <nav className="hidden md:flex flex-col w-60 flex-shrink-0 bg-background border-r border-border sticky top-0 h-screen">
      <div className="px-5 py-6">
        {squad ? (
          <Link href="/lag" className="block group" title="Byt lag">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{squad.organizationName}</p>
            <h1 className="text-lg font-bold text-foreground group-hover:underline underline-offset-4">{squad.squadName}</h1>
            {squad.role === 'viewer' && <p className="text-xs text-muted-foreground">Läsbehörighet</p>}
          </Link>
        ) : (
          <h1 className="text-lg font-bold text-foreground">Hela Laget</h1>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 flex-1">
        {homeTabs.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            href={to}
            className={
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActivePath(pathname, to)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        ))}

        {/* Admin section */}
        <button
          onClick={() => setAdminOpen(o => !o)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            adminActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Settings className="w-5 h-5" />
          <span>Admin</span>
          <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', adminOpen && 'rotate-180')} />
        </button>

        {adminOpen && (
          <div className="flex flex-col gap-1 pl-4">
            {(squad?.role === 'leader' || squad?.role === 'admin') && (
            <Link
              href="/planering"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActivePath(pathname, '/planering')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <CalendarRange className="w-4 h-4" />
              <span>Planering</span>
            </Link>
            )}
            {adminTabs.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                href={to}
                className={
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActivePath(pathname, to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )
            }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1">
          {extraLinks.map(({ to, icon: Icon, label, external }) => (
            <Link
              key={to}
              href={to}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === to ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Theme toggle */}
      <div className="px-3 pb-5">
        <button
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span>{theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}</span>
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logga ut</span>
        </button>
      </div>
    </nav>
  )
}
