'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Clock, LogOut, Loader2, X } from 'lucide-react'
import { useRequestJoin } from '../../hooks/backend/account'
import { getMe } from '../../lib/squad-store'
import { setSquadCookie } from '../../lib/squad-cookie'
import { signOut } from '../../lib/navigation'
import { Button } from '../../lib/shadcn/button'
import { Input } from '../../lib/shadcn/input'
import { Label } from '../../lib/shadcn/label'
import { Textarea } from '../../lib/shadcn/textarea'
import { ErrorText, PageHeader, ROLE_LABEL, Section } from './shared'

/** Mina lag: byt lag, se ansökningar och gå med i ett nytt lag med kod. */
export default function MySquads() {
  const me = getMe()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('kod') ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const { trigger: requestJoin, loading } = useRequestJoin()

  const approved = me?.memberships.filter((m) => m.status === 'approved') ?? []
  const pending = me?.memberships.filter((m) => m.status === 'pending') ?? []
  const rejected = me?.memberships.filter((m) => m.status === 'rejected') ?? []

  function open(squadId: number) {
    setSquadCookie(squadId)
    window.location.href = '/'
  }

  async function join(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSent(null)
    try {
      const res = await requestJoin({ code, message: message || null })
      if (res.status === 'approved') {
        open(res.squadId)
        return
      }
      setSent(`Ansökan skickad till ${res.organizationName} ${res.squadName}. Du får tillgång när lagets admin har godkänt den.`)
      setCode('')
      setMessage('')
      // Ladda om så att ansökan syns i listan
      setTimeout(() => window.location.reload(), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel.')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Mina lag" subtitle="Hela Laget" back={!!me?.current} />

      {approved.length > 0 && (
        <Section title="Dina lag">
          <ul className="flex flex-col gap-2">
            {approved.map((m) => {
              const isCurrent = me?.current?.squadId === m.squadId
              return (
                <li key={m.squadId}>
                  <button
                    onClick={() => open(m.squadId)}
                    className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted transition-colors"
                  >
                    <span className="w-3 h-10 rounded-sm shrink-0" style={{ backgroundColor: m.primaryColor }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs text-muted-foreground">{m.organizationName}</span>
                      <span className="block font-semibold truncate">{m.squadName}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>
                    {isCurrent && <Check className="w-4 h-4 text-primary" aria-label="Valt lag" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {(pending.length > 0 || rejected.length > 0) && (
        <Section title="Ansökningar">
          <ul className="flex flex-col gap-2 text-sm">
            {pending.map((m) => (
              <li key={m.squadId} className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1">{m.organizationName} {m.squadName}</span>
                <span className="text-muted-foreground">Väntar på godkännande</span>
              </li>
            ))}
            {rejected.map((m) => (
              <li key={m.squadId} className="flex items-center gap-2">
                <X className="w-4 h-4 text-destructive" />
                <span className="flex-1">{m.organizationName} {m.squadName}</span>
                <span className="text-muted-foreground">Nekad</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Gå med i ett lag">
        {approved.length === 0 && pending.length === 0 && (
          <p className="text-sm text-muted-foreground mb-3">
            Du är inte med i något lag ännu. Be en ledare om lagets kod eller inbjudningslänk.
          </p>
        )}
        <form onSubmit={join} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Lagets kod</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="t.ex. 4F7A9C2E"
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono tracking-widest"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">Meddelande till lagets admin (valfritt)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="t.ex. Förälder till Åke, eller ny ledare"
              rows={2}
            />
          </div>
          <Button type="submit" disabled={loading || code.trim().length < 4}>
            {loading && <Loader2 className="animate-spin" />}
            Skicka ansökan
          </Button>
          <ErrorText>{error}</ErrorText>
          {sent && <p className="text-sm text-success">{sent}</p>}
        </form>
      </Section>

      <Section title="Konto">
        <p className="text-sm">{me?.user.name ?? me?.user.email}</p>
        {me?.user.name && <p className="text-sm text-muted-foreground">{me.user.email}</p>}
        <Button variant="outline" size="sm" className="mt-3" onClick={signOut}>
          <LogOut /> Logga ut
        </Button>
      </Section>
    </div>
  )
}
