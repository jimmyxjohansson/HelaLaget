'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Send, Share, SquarePlus } from 'lucide-react'
import {
  useGetPushStatus,
  useSendTestPush,
  useSetPushSquad,
  useSubscribePush,
  useUnsubscribePush,
} from '../../hooks/backend/notifications'
import { currentSubscription, pushSupport, subscribe, type PushSupport } from '../../lib/push'
import { getMe } from '../../lib/squad-store'
import { Button } from '../../lib/shadcn/button'
import { Checkbox } from '../../lib/shadcn/checkbox'
import { ErrorText, PageHeader, Section } from './shared'

/** Slå på push-notiser för matcher på den här enheten och välj vilka lag. */
export default function Notifications() {
  const me = getMe()
  const squads = me?.memberships.filter((m) => m.status === 'approved') ?? []

  const status = useGetPushStatus()
  const subscribePush = useSubscribePush()
  const unsubscribePush = useUnsubscribePush()
  const setPushSquad = useSetPushSquad()
  const sendTest = useSendTestPush()

  const [support, setSupport] = useState<PushSupport | null>(null)
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [busySquad, setBusySquad] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function refresh() {
    const s = pushSupport()
    setSupport(s)
    let ep: string | null = null
    if (s === 'supported') {
      try {
        ep = (await currentSubscription())?.endpoint ?? null
      } catch {
        ep = null
      }
    }
    setEndpoint(ep)
    await status.trigger({ endpoint: ep }).catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const data = status.data
  const enabledHere = !!endpoint && !!data?.deviceSubscribed
  const followed = new Set(data?.squadIds ?? [])

  async function turnOn() {
    if (!data?.publicKey) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const sub = await subscribe(data.publicKey)
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await subscribePush.trigger({ subscription: json, userAgent: navigator.userAgent, squadId: me?.current?.squadId ?? null })
      await refresh()
      setInfo('Notiser är på. Skicka gärna en testnotis.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte slå på notiser.')
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const sub = await currentSubscription()
      if (sub) {
        await unsubscribePush.trigger({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte stänga av notiser.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleSquad(squadId: number, enabled: boolean) {
    setBusySquad(squadId)
    setError(null)
    try {
      await setPushSquad.trigger({ squadId, enabled })
      await status.trigger({ endpoint })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    } finally {
      setBusySquad(null)
    }
  }

  async function test() {
    setError(null)
    setInfo(null)
    try {
      const r = await sendTest.trigger()
      setInfo(`Testnotis skickad till ${r.sent} ${r.sent === 1 ? 'enhet' : 'enheter'}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte skicka testnotis.')
    }
  }

  const loading = support === null || (status.loading && !data)

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Notiser" subtitle="Hela Laget" />

      <Section title="Den här enheten">
        <p className="text-sm text-muted-foreground mb-3">
          Få en notis när laget gör mål, när motståndarna gör mål, vid avspark, paus och slutsignal. Notiser
          skickas bara under matchdagen och aldrig för avslutade matcher.
        </p>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : data && !data.configured ? (
          <p className="text-sm">Notiser är inte inställda på servern ännu. Kontakta appens administratör.</p>
        ) : support === 'ios-needs-install' ? (
          <div className="rounded-lg border border-border p-3 text-sm flex flex-col gap-2">
            <p className="font-medium">Lägg Hela Laget på hemskärmen först</p>
            <p className="text-muted-foreground">
              På iPhone fungerar notiser bara i den installerade appen:
            </p>
            <ol className="list-decimal pl-5 text-muted-foreground flex flex-col gap-1">
              <li>
                Tryck på <Share className="inline w-4 h-4 -mt-1" aria-label="Dela" /> Dela i Safari
              </li>
              <li>
                Välj <SquarePlus className="inline w-4 h-4 -mt-1" /> Lägg till på hemskärmen
              </li>
              <li>Öppna Hela Laget från hemskärmen och kom tillbaka hit</li>
            </ol>
          </div>
        ) : support === 'unsupported' ? (
          <p className="text-sm">
            Den här webbläsaren kan inte ta emot notiser. På iPhone krävs iOS 16.4 eller senare.
          </p>
        ) : enabledHere ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notiser är på för den här enheten.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={test} disabled={sendTest.loading}>
                {sendTest.loading ? <Loader2 className="animate-spin" /> : <Send />}
                Skicka testnotis
              </Button>
              <Button variant="ghost" onClick={turnOff} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <BellOff />}
                Stäng av
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={turnOn} disabled={busy || !data?.publicKey}>
            {busy ? <Loader2 className="animate-spin" /> : <Bell />}
            Slå på notiser
          </Button>
        )}
        <ErrorText>{error}</ErrorText>
        {info && <p className="text-sm text-muted-foreground mt-2">{info}</p>}
      </Section>

      {data?.configured && squads.length > 0 && (
        <Section title="Lag du får notiser från">
          <ul className="flex flex-col gap-2">
            {squads.map((m) => {
              const checked = followed.has(m.squadId)
              return (
                <li key={m.squadId}>
                  <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      disabled={busySquad === m.squadId}
                      onCheckedChange={(v: boolean | 'indeterminate') => toggleSquad(m.squadId, v === true)}
                    />
                    <span className="w-3 h-8 rounded-sm shrink-0" style={{ backgroundColor: m.primaryColor }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs text-muted-foreground">{m.organizationName}</span>
                      <span className="block font-semibold truncate">{m.squadName}</span>
                    </span>
                    {busySquad === m.squadId && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Valet gäller alla dina enheter med notiser påslagna
            {data.deviceCount > 0 ? ` (${data.deviceCount} st)` : ''}. Du får inga notiser om händelser du själv
            registrerar.
          </p>
        </Section>
      )}
    </div>
  )
}
