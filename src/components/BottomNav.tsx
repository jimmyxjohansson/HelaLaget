'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Users, Sun, Moon, Trophy, Medal, Shield, Settings, ListOrdered, CalendarRange, LogOut } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import { isActivePath, signOut } from '../lib/navigation'
import { currentSquad } from '../lib/squad-store'
import { accountLinks } from './accountLinks'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../lib/shadcn/dropdown-menu'

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


export default function BottomNav({ theme, onToggleTheme }: Props) {
  const pathname = usePathname() ?? '/'
  const squad = currentSquad()
  const extraLinks = accountLinks()
  // Första fliken heter som laget (t.ex. P-13) i stället för Hem
  const homeTabs = tabs.map((t) => (t.to === '/' && squad ? { ...t, label: squad.squadName } : t))
  const adminActive = [...adminTabs, ...extraLinks, { to: '/planering' }].some(t => pathname.startsWith(t.to))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border max-w-[430px] mx-auto pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {homeTabs.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            href={to}
            className={
            cn(
              'flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 text-xs font-medium transition-colors',
              isActivePath(pathname, to)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="max-w-full truncate px-1">{label}</span>
          </Link>
        ))}

        {/* Admin menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-xs font-medium transition-colors outline-none',
                adminActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Settings className="w-5 h-5" />
              <span>Admin</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-44 mb-1">
            <DropdownMenuLabel>
              {squad ? `${squad.organizationName} ${squad.squadName}` : 'Admin'}
              {squad?.role === 'viewer' && <span className="block text-xs font-normal text-muted-foreground">Läsbehörighet</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(squad?.role === 'leader' || squad?.role === 'admin') && (
            <DropdownMenuItem asChild>
              <Link href="/planering" className="flex items-center gap-2 cursor-pointer">
                <CalendarRange className="w-4 h-4" />
                <span>Planering</span>
              </Link>
            </DropdownMenuItem>
            )}
            {adminTabs.map(({ to, icon: Icon, label }) => (
              <DropdownMenuItem key={to} asChild>
                <Link href={to} className="flex items-center gap-2 cursor-pointer">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {extraLinks.map(({ to, icon: Icon, label }) => (
              <DropdownMenuItem key={to} asChild>
                <Link href={to} className="flex items-center gap-2 cursor-pointer">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="flex items-center gap-2 cursor-pointer">
              <LogOut className="w-4 h-4" />
              <span>Logga ut</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex flex-col items-center justify-center px-4 py-2 gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span>{theme === 'dark' ? 'Ljus' : 'Mörk'}</span>
        </button>
      </div>
    </nav>
  )
}
