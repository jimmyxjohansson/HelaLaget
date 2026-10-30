'use client'

import { ReactNode } from 'react'
import BottomNav from './BottomNav'
import SideNav from './SideNav'
import { useTheme } from '../hooks/useTheme'

interface Props {
  children: ReactNode
}

export default function MobileShell({ children }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex justify-center min-h-screen bg-muted">
      {/* Sidebar navigation for tablet / desktop landscape */}
      <SideNav theme={theme} onToggleTheme={toggleTheme} />

      {/* Content column */}
      <div className="relative w-full max-w-[430px] md:max-w-[1080px] bg-background flex flex-col min-h-screen shadow-lg md:shadow-none md:border-x md:border-border">
        <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        {/* Bottom navigation for mobile only */}
        <div className="md:hidden">
          <BottomNav theme={theme} onToggleTheme={toggleTheme} />
        </div>
      </div>
    </div>
  )
}
