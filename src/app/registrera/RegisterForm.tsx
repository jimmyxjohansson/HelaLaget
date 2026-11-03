'use client'

import Link from '../../lib/nav'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Mail, UserRound } from 'lucide-react'
import PasswordInput from '../PasswordInput'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/lib/shadcn/button'
import { Input } from '@/lib/shadcn/input'
import { Label } from '@/lib/shadcn/label'

export default function RegisterForm() {
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Lösenordet måste ha minst 8 tecken.')
      return
    }
    setBusy(true)
    setError(null)
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setBusy(false)
      setError(/already registered/i.test(error.message) ? 'Det finns redan ett konto med den e-postadressen. Logga in i stället.' : error.message)
      return
    }
    if (data.session) {
      // Ingen e-postbekräftelse krävs: direkt vidare
      window.location.href = next
      return
    }
    setBusy(false)
    setCheckEmail(true)
  }

  if (checkEmail) {
    return (
      <p className="rounded-lg bg-muted px-3 py-3 text-sm">
        Vi har skickat ett mejl till <span className="font-medium">{email}</span>. Klicka på länken i mejlet för att
        bekräfta kontot och logga sedan in.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Namn</Label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="name" autoComplete="name" placeholder="För- och efternamn" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 pl-9" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-post</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="namn@exempel.se" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-9" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Lösenord <span className="font-normal text-muted-foreground">(minst 8 tecken)</span></Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="mt-1 h-11" disabled={busy || !name || !email || !password}>
        {busy && <Loader2 className="animate-spin" />}
        Skapa konto
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Har du redan ett konto?{' '}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline underline-offset-4">
          Logga in
        </Link>
      </p>
    </form>
  )
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/lag'
  return value
}
