import type { ReactNode } from 'react'

/**
 * Ramen kring inloggning och registrering: ett neutralt mörkt fält med appens
 * ikon och namn, och ett kort med formuläret som ligger halvvägs över fältet.
 * Inga lagfärger här, eftersom alla föreningar loggar in på samma sida.
 */
export default function AuthShell({ title, subtitle, children, footer }: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-slate-900 px-4 pb-24 pt-14 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl shadow-lg ring-1 ring-white/20" />
        <p className="mt-4 text-2xl font-bold tracking-tight text-white">Hela Laget</p>
        <p className="mt-1 text-sm text-slate-300">Träningar, matcher och närvaro för hela laget</p>
      </div>
      <div className="mx-auto -mt-16 w-full max-w-sm px-4 pb-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  )
}
