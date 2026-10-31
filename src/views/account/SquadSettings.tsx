'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import {
  useDecideMember,
  useGetMembers,
  useGetSquadSettings,
  useRegenerateJoinCode,
  useRemoveMember,
  useUpdateMember,
  useUpdateSquadSettings,
} from '../../hooks/backend/members'
import {
  useAddLeadersToSquad,
  useCreateLeader,
  useGetLeaders,
  useGetOrganizationLeaders,
  useRemoveLeaderFromSquad,
  useUpdateLeader,
} from '../../hooks/backend/leaders'
import { currentSquad } from '../../lib/squad-store'
import { Button } from '../../lib/shadcn/button'
import { Input } from '../../lib/shadcn/input'
import { Label } from '../../lib/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../lib/shadcn/select'
import { ErrorText, PageHeader, ROLE_HELP, ROLE_LABEL, Section } from './shared'

type Role = 'viewer' | 'leader' | 'admin'
const ROLES: Role[] = ['viewer', 'leader', 'admin']

function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger className="w-36 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABEL[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Lagets medlemmar, inbjudan, inställningar och ledare. Bara för lagets admins. */
export default function SquadSettings() {
  const squad = currentSquad()
  const members = useGetMembers()
  const settings = useGetSquadSettings()
  const leaders = useGetLeaders()
  const decide = useDecideMember()
  const update = useUpdateMember()
  const remove = useRemoveMember()
  const regenerate = useRegenerateJoinCode()
  const saveSettings = useUpdateSquadSettings()
  const createLeader = useCreateLeader()
  const updateLeader = useUpdateLeader()
  const orgLeaders = useGetOrganizationLeaders()
  const addLeaders = useAddLeadersToSquad()
  const removeLeader = useRemoveLeaderFromSquad()

  const [error, setError] = useState<string | null>(null)
  const [approveRole, setApproveRole] = useState<Record<string, Role>>({})
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    name: '',
    primaryColor: '#106A37',
    accentColor: '#FFCF08',
    logoUrl: '',
    planningUrl: '',
    trainingAppUrl: '',
    svenskalagIcalUrl: '',
    svenskalagUrl: '',
  })
  const [savedSettings, setSavedSettings] = useState(false)
  const [newLeader, setNewLeader] = useState({ firstname: '', lastname: '' })
  const [pickLeader, setPickLeader] = useState('')
  const reloadLeaders = () => Promise.all([leaders.trigger(), orgLeaders.trigger()])

  useEffect(() => {
    members.trigger().catch(() => {})
    reloadLeaders().catch(() => {})
    settings
      .trigger()
      .then((s) => {
        if (s)
          setForm({
            name: s.name,
            primaryColor: s.primaryColor,
            accentColor: s.accentColor,
            logoUrl: s.logoUrl ?? '',
            planningUrl: s.planningUrl ?? '',
            trainingAppUrl: s.trainingAppUrl ?? '',
            svenskalagIcalUrl: s.svenskalagIcalUrl ?? '',
            svenskalagUrl: s.svenskalagUrl ?? '',
          })
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(action: () => Promise<unknown>, reload: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  const list = members.data ?? []
  const pending = list.filter((m) => m.status === 'pending')
  const approved = list.filter((m) => m.status === 'approved')
  const rejected = list.filter((m) => m.status === 'rejected')
  const joinCode = settings.data?.joinCode
  const joinLink = joinCode ? `${window.location.origin}/join/${joinCode}` : ''

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Kunde inte kopiera. Markera länken och kopiera den manuellt.')
    }
  }

  return (
    <div className="flex flex-col min-h-full pb-8">
      <PageHeader title="Laginställningar" subtitle={squad ? `${squad.organizationName} ${squad.squadName}` : ''} />
      {error && <div className="px-4 pt-3"><ErrorText>{error}</ErrorText></div>}

      <Section title={`Ansökningar${pending.length ? ` (${pending.length})` : ''}`}>
        {members.loading && !members.data ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga nya ansökningar.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((m) => (
              <li key={m.userId} className="rounded-lg border border-border p-3 flex flex-col gap-2">
                <div>
                  <p className="font-medium">{m.name ?? m.email}</p>
                  {m.name && <p className="text-xs text-muted-foreground">{m.email}</p>}
                  {m.message && <p className="text-sm mt-1 italic">”{m.message}”</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RoleSelect
                    value={approveRole[m.userId] ?? 'viewer'}
                    onChange={(r) => setApproveRole((s) => ({ ...s, [m.userId]: r }))}
                  />
                  <Button
                    size="sm"
                    disabled={decide.loading}
                    onClick={() =>
                      run(
                        () => decide.trigger({ userId: m.userId, approve: true, role: approveRole[m.userId] ?? 'viewer' }),
                        () => members.trigger(),
                      )
                    }
                  >
                    <Check /> Godkänn
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.loading}
                    onClick={() => run(() => decide.trigger({ userId: m.userId, approve: false }), () => members.trigger())}
                  >
                    <X /> Neka
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Bjud in">
        <p className="text-sm text-muted-foreground mb-3">
          Skicka länken eller koden till ledare och föräldrar. De registrerar ett konto och ansöker; du godkänner här.
        </p>
        {joinCode ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input readOnly value={joinLink} className="text-xs" onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? <Check /> : <Copy />} {copied ? 'Kopierad' : 'Kopiera'}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Kod:</span>
              <span className="font-mono tracking-widest font-semibold">{joinCode}</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                disabled={regenerate.loading}
                onClick={() => {
                  if (confirmAction('Skapa en ny kod? Den gamla koden och länken slutar fungera.')) {
                    run(() => regenerate.trigger(), () => settings.trigger())
                  }
                }}
              >
                <RefreshCw /> Ny kod
              </Button>
            </div>
          </div>
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </Section>

      <Section title={`Medlemmar (${approved.length})`}>
        <ul className="flex flex-col divide-y divide-border">
          {approved.map((m) => (
            <li key={m.userId} className="py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.name ?? m.email} {m.isMe && <span className="text-muted-foreground font-normal">(du)</span>}
                </p>
                {m.name && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
              </div>
              <RoleSelect
                value={m.role}
                disabled={m.isMe || update.loading}
                onChange={(r) => run(() => update.trigger({ userId: m.userId, role: r }), () => members.trigger())}
              />
              {!m.isMe && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Ta bort ${m.name ?? m.email}`}
                  onClick={() => {
                    if (confirmAction(`Ta bort ${m.name ?? m.email} från laget?`)) {
                      run(() => remove.trigger({ userId: m.userId }), () => members.trigger())
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <dl className="mt-3 text-xs text-muted-foreground flex flex-col gap-1">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="inline font-medium text-foreground">{ROLE_LABEL[r]}: </dt>
              <dd className="inline">{ROLE_HELP[r]}</dd>
            </div>
          ))}
        </dl>
        {rejected.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Nekade: {rejected.map((m) => m.name ?? m.email).join(', ')}
          </p>
        )}
      </Section>

      <Section title="Lagets inställningar">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setSavedSettings(false)
            run(
              () => saveSettings.trigger(form),
              async () => {
                setSavedSettings(true)
                // Ladda om så att namn och färger slår igenom i hela appen
                setTimeout(() => window.location.reload(), 800)
              },
            )
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sq-name">Lagets namn</Label>
            <Input id="sq-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sq-primary">Huvudfärg</Label>
              <input
                id="sq-primary"
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-9 w-20 rounded-md border border-input bg-transparent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sq-accent">Textfärg</Label>
              <input
                id="sq-accent"
                type="color"
                value={form.accentColor}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                className="h-9 w-20 rounded-md border border-input bg-transparent"
              />
            </div>
            <div
              className="flex-1 rounded-md flex items-center justify-center text-sm font-semibold self-end h-9"
              style={{ backgroundColor: form.primaryColor, color: form.accentColor }}
            >
              {form.name || 'Förhandsvisning'}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sq-logo">Logga (länk till bild)</Label>
            <Input
              id="sq-logo"
              value={form.logoUrl}
              placeholder="https://…"
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sq-train">Länk till träningsapp (valfritt, {'{id}'} ersätts med träningens id)</Label>
            <Input
              id="sq-train"
              value={form.trainingAppUrl}
              placeholder="https://…#trainingid={id}"
              onChange={(e) => setForm({ ...form, trainingAppUrl: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sq-svl-site">Lagets sida på Svenskalag (valfritt)</Label>
            <Input
              id="sq-svl-site"
              value={form.svenskalagUrl}
              placeholder="https://www.svenskalag.se/…"
              onChange={(e) => setForm({ ...form, svenskalagUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Visas som länken Svenskalag i menyn, under Mina lag.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sq-svl">Svenskalag-kalender (valfritt)</Label>
            <Input
              id="sq-svl"
              value={form.svenskalagIcalUrl}
              placeholder="webcal://… eller https://…svenskalag.se…"
              onChange={(e) => setForm({ ...form, svenskalagIcalUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              I Svenskalag: lagets kalender → Prenumerera → kopiera länken. Träningar och matcher hämtas då automatiskt
              (Admin → Svenskalag).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saveSettings.loading}>
              {saveSettings.loading && <Loader2 className="animate-spin" />}
              Spara
            </Button>
            {savedSettings && <span className="text-sm text-success">Sparat</span>}
          </div>
        </form>
      </Section>

      <Section title="Ledare">
        <p className="text-sm text-muted-foreground mb-3">
          Lagets ledare, som kan registreras som närvarande på träningar och matcher. En ledare kan vara med i
          flera av föreningens lag. Inaktivera gäller i alla lag; Ta bort gäller bara det här laget.
        </p>
        <ul className="flex flex-col divide-y divide-border mb-3">
          {(leaders.data ?? []).map((l) => (
            <li key={l.id} className="py-2 flex items-center gap-2 text-sm">
              <span className={`flex-1 ${l.active ? '' : 'text-muted-foreground line-through'}`}>
                {[l.firstname, l.lastname].filter(Boolean).join(' ') || l.shortname}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  run(
                    () =>
                      updateLeader.trigger({
                        id: l.id,
                        firstname: l.firstname ?? '',
                        lastname: l.lastname,
                        shortname: l.shortname,
                        active: !l.active,
                      }),
                    () => leaders.trigger(),
                  )
                }
              >
                {l.active ? 'Inaktivera' : 'Aktivera'}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Ta bort ${l.shortname ?? l.firstname} från laget`}
                title="Ta bort från laget"
                onClick={() => {
                  if (confirmAction(`Ta bort ${[l.firstname, l.lastname].filter(Boolean).join(' ') || l.shortname} från lagets ledare? Historiken finns kvar.`)) {
                    run(() => removeLeader.trigger({ leaderId: l.id }), reloadLeaders)
                  }
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(
              () => createLeader.trigger(newLeader),
              async () => {
                setNewLeader({ firstname: '', lastname: '' })
                await reloadLeaders()
              },
            )
          }}
        >
          <Input
            placeholder="Förnamn"
            value={newLeader.firstname}
            onChange={(e) => setNewLeader({ ...newLeader, firstname: e.target.value })}
          />
          <Input
            placeholder="Efternamn"
            value={newLeader.lastname}
            onChange={(e) => setNewLeader({ ...newLeader, lastname: e.target.value })}
          />
          <Button type="submit" variant="outline" disabled={!newLeader.firstname.trim() || createLeader.loading}>
            <Plus /> Ny ledare
          </Button>
        </form>
        {(orgLeaders.data ?? []).length > 0 && (
          <div className="flex gap-2 mt-3">
            <Select value={pickLeader} onValueChange={setPickLeader}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Ledare från föreningens andra lag" />
              </SelectTrigger>
              <SelectContent>
                {(orgLeaders.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {[l.firstname, l.lastname].filter(Boolean).join(' ') || l.shortname}
                    {l.squads ? ` (${l.squads})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!pickLeader || addLeaders.loading}
              onClick={() =>
                run(
                  () => addLeaders.trigger({ leaderIds: [Number(pickLeader)] }),
                  async () => {
                    setPickLeader('')
                    await reloadLeaders()
                  },
                )
              }
            >
              <Plus /> Lägg till
            </Button>
          </div>
        )}
      </Section>
    </div>
  )
}

function confirmAction(text: string) {
  return window.confirm(text)
}
