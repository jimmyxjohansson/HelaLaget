'use client'

import { useRouter } from '../../lib/nav'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

export const ROLE_LABEL: Record<string, string> = {
  player: 'Spelare',
  relative: 'Anhörig',
  viewer: 'Anhörig',
  leader: 'Ledare',
  admin: 'Admin',
}

export const ROLE_HELP: Record<string, string> = {
  player: 'Spelaren själv. Ser schema, resultat och närvaro, och statistik för sin kopplade spelare. Ändrar inget.',
  relative: 'Förälder eller annan anhörig. Ser schema, resultat och närvaro, och statistik för de kopplade spelarna. Ändrar inget.',
  viewer: 'Ser schema, resultat och närvaro. Ändrar inget.',
  leader: 'Registrerar träningar, matcher, cuper och spelare.',
  admin: 'Som ledare, och godkänner medlemmar och ändrar lagets inställningar.',
}

export function PageHeader({ title, subtitle, back = true }: { title: string; subtitle?: string; back?: boolean }) {
  const router = useRouter()
  return (
    <div className="text-team-accent px-4 pt-6 pb-4" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
      {back && (
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-team-accent/80 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Tillbaka
        </button>
      )}
      {subtitle && <p className="text-team-accent/70 text-sm font-medium uppercase tracking-widest">{subtitle}</p>}
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="px-4 py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="text-sm text-destructive mt-2">{children}</p>
}
