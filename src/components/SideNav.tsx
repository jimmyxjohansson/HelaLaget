'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Home, CalendarDays, Users, Sun, Moon, Trophy, Medal, Shield, Settings, ChevronDown, ListOrdered, CalendarRange, LogOut } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import { isActivePath, signOut } from '../lib/navigation'

const PLANERING_URL = 'https://skabersjoifp13.retool.com/apps/d82e8f9c-c1cf-11ee-a364-47bcb6eb07b0/Planering?_embed=true'

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
  { to: '/teams', icon: Shield, label: 'Lag' },
]

export default function SideNav({ theme, onToggleTheme }: Props) {
  const pathname = usePathname() ?? '/'
  const adminActive = adminTabs.some(t => pathname.startsWith(t.to))
  const [adminOpen, setAdminOpen] = useState(adminActive)

  return (
    <nav className="hidden md:flex flex-col w-60 flex-shrink-0 bg-background border-r border-border sticky top-0 h-screen">
      <div className="px-5 py-6">
        <h1 className="text-lg font-bold text-foreground">Skabersjö IF</h1>
      </div>
      <div className="flex flex-col gap-1 px-3 flex-1">
        {tabs.map(({ to, icon: Icon, label }) => (
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
            <a
              href={PLANERING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <CalendarRange className="w-4 h-4" />
              <span>Planering</span>
            </a>
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
