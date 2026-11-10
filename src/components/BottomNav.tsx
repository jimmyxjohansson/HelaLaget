'use client'

import Link, { usePathname } from '../lib/nav'
import { useState } from 'react'
import { LogOut, Menu, Moon, Sun } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import { isActivePath, signOut } from '../lib/navigation'
import { getMe, roleLabel } from '../lib/squad-store'
import { Sheet, SheetContent, SheetTitle } from '../lib/shadcn/sheet'
import SquadLogo from './SquadLogo'
import SquadSwitchMenu from './SquadSwitchMenu'
import { isItemActive, mainItems, navGroups } from './navItems'

type Theme = 'light' | 'dark'

interface Props {
  theme: Theme
  onToggleTheme: () => void
}

export default function BottomNav({ theme, onToggleTheme }: Props) {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)
  const me = getMe()
  const squad = me?.current
  const tabs = mainItems()
  const groups = navGroups()
  const all = groups.flatMap((g) => g.items)
  const moreActive = all.some((i) => isItemActive(pathname, i, all))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border max-w-[430px] mx-auto pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {tabs.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            href={to}
            className={cn(
              'flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 text-xs font-medium transition-colors',
              isActivePath(pathname, to) && !moreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="max-w-full truncate px-1">{label}</span>
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            'flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 text-xs font-medium transition-colors outline-none',
            moreActive || open ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Menu className="w-5 h-5" />
          <span>Mer</span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[85vh] max-w-[430px] flex-col gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />

          {/* Valt lag (byt lag under Mitt konto) */}
          <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-2 pr-12">
            <SquadLogo className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-bold text-foreground">{squad?.squadName ?? 'Hela Laget'}</SheetTitle>
              <p className="truncate text-xs text-muted-foreground">
                {squad?.organizationName}
                {squad?.role === 'viewer' && ` · ${roleLabel(squad)}`}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {groups.map((g) => (
              <section key={g.title} className="py-2">
                <h3 className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {g.items.map((item) => {
                    const Icon = item.icon
                    const active = isItemActive(pathname, item, all)
                    if (item.switchSquad) {
                      return (
                        <SquadSwitchMenu key={item.to} side="top" align="start" onSwitch={() => setOpen(false)}>
                          <button type="button"
                            className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5 text-left text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted data-[state=open]:bg-muted">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 leading-tight">{item.label}</span>
                          </button>
                        </SquadSwitchMenu>
                      )
                    }
                    return (
                      <Link
                        key={item.to}
                        href={item.to}
                        onClick={() => setOpen(false)}
                        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          active ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', !active && 'text-muted-foreground')} />
                        <span className="min-w-0 leading-tight">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Konto */}
          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{me?.user.name ?? me?.user.email ?? ''}</p>
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/70"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/70"
            >
              <LogOut className="h-3.5 w-3.5" /> Logga ut
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
