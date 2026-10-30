'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Lösenord</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || !email || !password}>
        {busy && <Loader2 className="animate-spin" />}
        Logga in
      </Button>
      <p className="text-sm text-muted-foreground">
        Ny här?{' '}
        <Link
          href={`/registrera?next=${encodeURIComponent(safeNext(searchParams.get('next')))}`}
          className="underline underline-offset-4"
        >
          Skapa konto
        </Link>
      </p>
      <p className="text-xs text-muted-foreground">Glömt lösenordet? Kontakta en administratör.</p>
    </form>
  )
}

/** Tillåt bara interna sökvägar som mål efter inloggning. */
function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
