'use client'

import Link from '../../lib/nav'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Mail, Users } from 'lucide-react'
import PasswordInput from '../PasswordInput'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/lib/shadcn/button'
import { Input } from '@/lib/shadcn/input'
import { Label } from '@/lib/shadcn/label'

/**
 * Inloggning med e-post och lösenord. Nya användare skapar konto på /registrera
 * och ansöker sedan om att gå med i ett lag.
 */
export default function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setBusy(false)
      setError(
        /invalid login credentials/i.test(error.message)
          ? 'Fel e-post eller lösenord.'
          : error.message,
      )
      return
    }
    // Full omladdning så att servern ser den nya sessionen direkt.
    window.location.href = safeNext(searchParams.get('next'))
  }

  const next = safeNext(searchParams.get('next'))
  const joining = next.startsWith('/join/')

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {joining && (
        <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          Du har fått en inbjudan till ett lag. Logga in, eller skapa ett konto, så kommer du vidare till laget.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-post</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="namn@exempel.se"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Lösenord</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="mt-1 h-11" disabled={busy || !email || !password}>
        {busy && <Loader2 className="animate-spin" />}
        Logga in
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> Ny i Hela Laget? <span className="h-px flex-1 bg-border" />
      </div>
      <Button asChild variant="outline" size="lg" className="h-11">
        <Link href={`/registrera?next=${encodeURIComponent(next)}`}>Skapa konto</Link>
      </Button>
    </form>
  )
}

/** Tillåt bara interna sökvägar som mål efter inloggning. */
function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
