'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Heart, ImageIcon, Loader2, Plus, RefreshCw, ShieldCheck, Shirt, Trash2, Upload, UserCheck, X } from 'lucide-react'
import { uploadImage } from '../../lib/storage'
import {
  useDecideMember,
  useGetLinkablePlayers,
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
import { GAME_FORMATS } from '../../utils/gameFormats'
import { LEVEL_MATRICES } from '../../utils/levelMatrix'
import GameFormats, { formatText } from './GameFormats'
import { ErrorText, PageHeader, ROLE_HELP, ROLE_LABEL, Section } from './shared'
import SquadInfos from './SquadInfos'

/** Roller som admin väljer. Spelare och Anhörig är läsbehörighet kopplad till spelare. */
type Role = 'player' | 'relative' | 'leader' | 'admin'
const ROLES: Role[] = ['player', 'relative', 'leader', 'admin']
const ROLE_ICON: Record<Role, typeof Heart> = { admin: ShieldCheck, leader: UserCheck, player: Shirt, relative: Heart }
const ROLE_TONE: Record<Role, string> = {
  admin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  leader: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  player: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  relative: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
}

function memberRole(m: { role: string; memberKind?: string | null }): Role {
  if (m.role === 'viewer') return m.memberKind === 'player' ? 'player' : 'relative'
  return m.role === 'admin' ? 'admin' : 'leader'
}

function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger className="w-32 h-8 text-xs">
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

type LinkablePlayer = { id: number; name: string; status: string | null }

/** Kopplade spelare som etiketter, och en lista för att lägga till. Spelare kopplas till en, Anhörig till flera. */
function PlayerLinks({ role, value, players, onChange, disabled }: {
  role: Role
  value: number[]
  players: LinkablePlayer[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}) {
  const single = role === 'player'
  const chosen = value.map((id) => players.find((p) => p.id === id)).filter(Boolean) as LinkablePlayer[]
  const rest = players.filter((p) => !value.includes(p.id))
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
          {p.name}
          <button type="button" disabled={disabled} onClick={() => onChange(value.filter((v) => v !== p.id))}
            aria-label={`Ta bort kopplingen till ${p.name}`} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {(!single || chosen.length === 0) && (
        <select
          value=""
          disabled={disabled}
          onChange={(e) => {
            const id = Number(e.target.value)
            if (id) onChange(single ? [id] : [...value, id])
          }}
          className={`h-7 rounded-md border bg-background px-2 text-xs ${chosen.length === 0 ? 'border-amber-500' : 'border-border'}`}
        >
          <option value="">{chosen.length ? '+ Spelare' : 'Koppla till spelare…'}</option>
          {rest.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.status && p.status !== 'Aktiv' ? ` (${p.status})` : ''}</option>
          ))}
        </select>
      )}
    </div>
  )
}

/** Lagets medlemmar, inbjudan, inställningar och ledare. Bara för lagets admins. */
export default function SquadSettings() {
  const squad = currentSquad()
  const members = useGetMembers()
  const settings = useGetSquadSettings()
  const leaders = useGetLeaders()
  const decide = useDecideMember()
  const linkable = useGetLinkablePlayers()
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
  const [approveLinks, setApproveLinks] = useState<Record<string, number[]>>({})
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    name: '',
    primaryColor: '#106A37',
    accentColor: '#FFCF08',
    logoUrl: '',
    planningUrl: '',
    svenskalagIcalUrl: '',
    siteUrl: '',
    siteName: '',
    docsUrl: '',
    docsName: '',
    gameFormat: '',
    levelMatrix: '',
    tacticsBoard: false,
  })
  const [savedSettings, setSavedSettings] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const logoInput = useRef<HTMLInputElement | null>(null)

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Välj en bildfil.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Bilden är för stor (max 5 MB).'); return }
    setUploadingLogo(true)
    setError(null)
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => { const r = reader.result as string; resolve(r.slice(r.indexOf(',') + 1)) }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const { url } = await uploadImage({ data, fileName: file.name, mimeType: file.type }, 'squads')
      setLogoFailed(false)
      setForm((f) => ({ ...f, logoUrl: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda upp loggan.')
    } finally {
      setUploadingLogo(false)
    }
  }
  const [newLeader, setNewLeader] = useState({ firstname: '', lastname: '' })
  const [pickLeader, setPickLeader] = useState('')
  const reloadLeaders = () => Promise.all([leaders.trigger(), orgLeaders.trigger()])

  useEffect(() => {
    members.trigger().catch(() => {})
    linkable.trigger().catch(() => {})
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
            svenskalagIcalUrl: s.svenskalagIcalUrl ?? '',
            siteUrl: s.siteUrl ?? '',
            siteName: s.siteName ?? '',
            docsUrl: s.docsUrl ?? '',
            docsName: s.docsName ?? '',
            gameFormat: s.gameFormat ?? '',
            levelMatrix: s.levelMatrix ?? '',
            tacticsBoard: !!s.tacticsBoard,
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
                    value={approveRole[m.userId] ?? 'relative'}
                    onChange={(r) => {
                      setApproveRole((s) => ({ ...s, [m.userId]: r }))
                      if (r === 'player') setApproveLinks((s) => ({ ...s, [m.userId]: (s[m.userId] ?? []).slice(0, 1) }))
                    }}
                  />
                  {['player', 'relative'].includes(approveRole[m.userId] ?? 'relative') && (
                    <PlayerLinks
                      role={approveRole[m.userId] ?? 'relative'}
                      value={approveLinks[m.userId] ?? []}
                      players={linkable.data ?? []}
                      onChange={(ids) => setApproveLinks((s) => ({ ...s, [m.userId]: ids }))}
                    />
                  )}
                  <Button
                    size="sm"
                    disabled={decide.loading}
                    onClick={() =>
                      run(
                        () => decide.trigger({ userId: m.userId, approve: true, role: approveRole[m.userId] ?? 'relative', playerIds: approveLinks[m.userId] ?? [] }),
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
        <div className="flex flex-col gap-4">
          {(['admin', 'leader', 'player', 'relative'] as Role[]).map((r) => {
            const group = approved.filter((m) => memberRole(m) === r)
            const Icon = ROLE_ICON[r]
            return (
              <div key={r} className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-start gap-3 bg-muted/50 px-3 py-2.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ROLE_TONE[r]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {ROLE_LABEL[r]} <span className="font-normal text-muted-foreground">· {group.length}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{ROLE_HELP[r]}</p>
                  </div>
                </div>
                {group.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-muted-foreground">Ingen {r === 'admin' ? 'admin' : r === 'leader' ? 'ledare' : r === 'player' ? 'spelare' : 'anhörig'} ännu.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {group.map((m) => {
                      const display = m.name ?? m.email
                      const initials = (display ?? '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('')
                      return (
                        <li key={m.userId} className="flex items-center gap-3 px-3 py-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {display} {m.isMe && <span className="font-normal text-muted-foreground">(du)</span>}
                            </p>
                            {m.name && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                            {(r === 'player' || r === 'relative') && (
                              <div className="mt-1">
                                <PlayerLinks
                                  role={r}
                                  value={m.playerIds ?? []}
                                  players={linkable.data ?? []}
                                  disabled={update.loading}
                                  onChange={(ids) => run(() => update.trigger({ userId: m.userId, role: r, playerIds: ids }), () => members.trigger())}
                                />
                              </div>
                            )}
                          </div>
                          <RoleSelect
                            value={memberRole(m)}
                            disabled={m.isMe || update.loading}
                            onChange={(nr) => run(
                              () => update.trigger({ userId: m.userId, role: nr, playerIds: nr === 'player' ? (m.playerIds ?? []).slice(0, 1) : m.playerIds ?? [] }),
                              () => members.trigger(),
                            )}
                          />
                          {!m.isMe && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Ta bort ${display}`}
                              onClick={() => {
                                if (confirmAction(`Ta bort ${display} från laget?`)) {
                                  run(() => remove.trigger({ userId: m.userId }), () => members.trigger())
                                }
                              }}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
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
            <Label htmlFor="sq-logo">Logga</Label>
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border"
                style={{ backgroundColor: form.primaryColor }}
              >
                {form.logoUrl && !logoFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="Lagets logga" onError={() => setLogoFailed(true)} className="h-12 w-12 object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6" style={{ color: form.accentColor }} />
                )}
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, logoUrl: '' }); setLogoFailed(false) }}
                    aria-label="Ta bort loggan"
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input ref={logoInput} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => logoInput.current?.click()} disabled={uploadingLogo} className="self-start">
                  {uploadingLogo
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Laddar upp…</>
                    : <><Upload className="mr-2 h-4 w-4" /> Ladda upp logga</>}
                </Button>
                <p className="text-xs text-muted-foreground">PNG eller SVG med genomskinlig bakgrund blir finast. Spara för att byta.</p>
              </div>
            </div>
            <Input
              id="sq-logo"
              value={form.logoUrl}
              placeholder="…eller klistra in en länk till bilden"
              onChange={(e) => { setForm({ ...form, logoUrl: e.target.value }); setLogoFailed(false) }}
              className="text-xs"
            />
          </div>
          {([
            { key: 'site', title: 'Lagets sida', urlPh: 'https://www.svenskalag.se/…', namePh: 'Lagets sida', example: 'till exempel Svenskalag eller lagets hemsida' },
            { key: 'docs', title: 'Dokument', urlPh: 'https://…', namePh: 'Dokument', example: 'till exempel en delad mapp med kallelser och scheman' },
          ] as const).map((l) => {
            const urlKey = `${l.key}Url` as const
            const nameKey = `${l.key}Name` as const
            return (
              <div key={l.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`sq-${l.key}-url`}>{l.title} (valfritt)</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-col gap-1 sm:flex-[2]">
                    <span className="text-xs text-muted-foreground">Adress</span>
                    <Input
                      id={`sq-${l.key}-url`}
                      value={form[urlKey]}
                      placeholder={l.urlPh}
                      onChange={(e) => setForm({ ...form, [urlKey]: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:flex-1">
                    <span className="text-xs text-muted-foreground">Namn i menyn</span>
                    <Input
                      aria-label={`Namn på länken ${l.title}`}
                      value={form[nameKey]}
                      maxLength={40}
                      placeholder={l.key === 'site' ? 'Svenskalag' : 'Dokument'}
                      onChange={(e) => setForm({ ...form, [nameKey]: e.target.value })}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Visas i menyn under Länkar med namnet du anger ({form[nameKey].trim() || l.namePh}), {l.example}.
                </p>
              </div>
            )
          })}
          <div className="flex flex-col gap-1.5">
            <Label>Spelform</Label>
            <Select value={form.gameFormat || '__none__'} onValueChange={(v) => setForm({ ...form, gameFormat: v === '__none__' ? '' : v })}>
              <SelectTrigger aria-label="Spelform" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen</SelectItem>
                {GAME_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.gameFormat && settings.data?.formats?.[form.gameFormat]
                ? `Nya matcher och cuper får ${form.gameFormat}${formatText(settings.data.formats[form.gameFormat]) ? `, ${formatText(settings.data.formats[form.gameFormat])}` : ''}. `
                : 'Används när matcher och cuper läggs till eller hämtas från Svenskalag. '}
              Går att ändra på varje match och cup.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.tacticsBoard} onChange={(e) => setForm({ ...form, tacticsBoard: e.target.checked })}
                className="h-4 w-4" />
              Visa Taktiktavlan
            </label>
            <p className="text-xs text-muted-foreground">
              Taktiktavlan (zonförsvar och anfall i 9 mot 9 och 11 mot 11) visas för lagets ledare under Laget i menyn.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nivåmatris</Label>
            <Select value={form.levelMatrix || '__none__'} onValueChange={(v) => setForm({ ...form, levelMatrix: v === '__none__' ? '' : v })}>
              <SelectTrigger aria-label="Nivåmatris" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen</SelectItem>
                {Object.values(LEVEL_MATRICES).map((m) => <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Med en nivåmatris får ledarna knappen Beräkna nivå på spelarna. Välj den som passar lagets ålder.
            </p>
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
              (Mer → Svenskalag-synk).
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

      {settings.data && (
        <GameFormats initial={settings.data.formats} canEdit={settings.data.canEditFormats}
          onSaved={() => settings.trigger().catch(() => {})} />
      )}

      <SquadInfos />

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
