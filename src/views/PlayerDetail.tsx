'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useGetPlayer, useGetPlayerStats, useUpdatePlayer, useUploadPlayerImage } from '../hooks/backend/players'
import { ArrowLeft, Edit2, Check, X, User, Upload, Loader2 } from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import DatePicker from '../components/DatePicker'
import { canEdit } from '../lib/squad-store'
import PlayerStats, { StatsSummary } from './player/PlayerStats'
import { cn } from '../lib/shadcn/utils'

const PERIODS = [
  { months: 1, label: '1 mån' },
  { months: 2, label: '2 mån' },
  { months: 3, label: '3 mån' },
  { months: 6, label: '6 mån' },
  { months: 12, label: '1 år' },
  { months: 0, label: 'Alla' },
]

const STATUS_OPTIONS = ['Aktiv', 'Aktiv, ej matchklar', 'Vilande', 'Gästspelare', 'Slutat']
const RANK_OPTIONS = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D']
const FOOT_OPTIONS = ['Höger', 'Vänster', 'Båda']

const STATUS_BADGE: Record<string, string> = {
  Aktiv: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  'Aktiv, ej matchklar': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  Vilande: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  Gästspelare: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Slutat: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}

const POSITIONS = [
  { key: 'goalkeeper', label: 'Målvakt' },
  { key: 'defender', label: 'Försvarare' },
  { key: 'defensivemidfielder', label: 'Defensiv MF' },
  { key: 'offensivemidfielder', label: 'Offensiv MF' },
  { key: 'winger', label: 'Ytter' },
  { key: 'striker', label: 'Anfallare' },
] as const

type PositionKey = typeof POSITIONS[number]['key']

interface PlayerData {
  id: number
  firstname: string
  lastname: string
  shortname: string
  number: number | null
  birthdate: string | null
  rank: string | null
  active: boolean
  status: string
  backbone: string | null
  img: string | null
  defender: boolean
  defensivemidfielder: boolean
  offensivemidfielder: boolean
  winger: boolean
  striker: boolean
  goalkeeper: boolean
  memberid: number | null
  foot: string | null
  comment: string | null
  gender: string | null
  shirt_size: string | null
  shorts_size: string | null
  sock_size: string | null
  sessions_attended: string
  total_sessions: string
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Match the training-attendance window used by the player list (defaults to 2 months).
  const monthsParam = searchParams.get('months')
  const [months, setMonths] = useState(() => {
    const n = monthsParam != null && monthsParam !== '' ? Number(monthsParam) : 2
    return Number.isFinite(n) ? n : 2
  })
  const { data, loading, trigger } = useGetPlayer()
  const stats = useGetPlayerStats()
  const infoRef = useRef<HTMLDivElement>(null)
  const { trigger: updateTrigger, loading: saving } = useUpdatePlayer()
  const { trigger: uploadImage, loading: uploadingImg } = useUploadPlayerImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PlayerData | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    trigger({ id: Number(id), months })
    stats.trigger({ playerId: Number(id), months }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, months])

  function changeMonths(n: number) {
    setMonths(n)
    // Behåll perioden i adressen, så att Tillbaka och omladdning visar samma
    const url = new URL(window.location.href)
    url.searchParams.set('months', String(n))
    window.history.replaceState(null, '', url.toString())
  }

  const player = data as unknown as PlayerData | null | undefined

  useEffect(() => {
    if (player) setForm({ ...player })
  }, [player])

  // Från spelarlistans Redigera-knapp (?edit=1): öppna redigeringen direkt
  const autoEdit = useRef(searchParams.get('edit') === '1')
  useEffect(() => {
    if (player && autoEdit.current && canEdit()) {
      autoEdit.current = false
      handleEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player])

  function handleEdit() {
    if (player) setForm({ ...player })
    setEditing(true)
    setSaved(false)
    setSaveError(null)
    requestAnimationFrame(() => infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function handleCancel() {
    setEditing(false)
    setSaveError(null)
  }

  async function handleSave() {
    if (!form) return
    setSaveError(null)
    try {
      await updateTrigger({
        id: form.id,
        firstname: form.firstname,
        lastname: form.lastname,
        shortname: form.shortname,
        number: form.number,
        birthdate: form.birthdate,
        status: form.status,
        rank: form.rank,
        foot: form.foot,
        comment: form.comment,
        img: form.img,
        backbone: form.backbone,
        memberid: form.memberid,
        defender: form.defender,
        defensivemidfielder: form.defensivemidfielder,
        offensivemidfielder: form.offensivemidfielder,
        winger: form.winger,
        striker: form.striker,
        goalkeeper: form.goalkeeper,
        gender: form.gender,
        shirt_size: form.shirt_size,
        shorts_size: form.shorts_size,
        sock_size: form.sock_size,
      })
      setEditing(false)
      setSaved(true)
      trigger({ id: Number(id), months })
    } catch {
      setSaveError('Kunde inte spara. Försök igen.')
    }
  }

  function setField<K extends keyof PlayerData>(key: K, value: PlayerData[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setSaveError(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const res = reader.result as string
          const comma = res.indexOf(',')
          resolve(comma >= 0 ? res.slice(comma + 1) : res)
        }
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(file)
      })
      const res = await uploadImage({ data: base64, fileName: file.name, mimeType: file.type })
      const url = (res as { url: string } | undefined)?.url
      if (url) setField('img', url)
    } catch {
      setSaveError('Kunde inte ladda upp bilden. Försök igen.')
    }
  }

  function togglePosition(key: PositionKey) {
    setForm(prev => prev ? { ...prev, [key]: !prev[key] } : prev)
  }

  const displayPlayer = editing ? form : player

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-team-accent/80 hover:text-team-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Tillbaka</span>
          </button>
        </div>
      </div>

      {loading && !displayPlayer && (
        <div className="flex flex-col gap-4 p-4">
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
        </div>
      )}

      {displayPlayer && (
        <div className="grid gap-4 p-4 pb-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:items-start">
          {/* Profile card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden md:col-start-1 md:row-start-1">
            {/* Avatar row */}
            <div className="flex items-center gap-4 p-4">
              <div className="relative flex-shrink-0">
                {displayPlayer.img ? (
                  <img
                    src={displayPlayer.img}
                    alt={displayPlayer.shortname}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                {displayPlayer.number != null && (
                  <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-card">
                    {displayPlayer.number}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xl text-foreground leading-tight">
                  {displayPlayer.shortname}
                </div>
                <div className="text-sm text-muted-foreground">
                  {displayPlayer.firstname} {displayPlayer.lastname}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[displayPlayer.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {displayPlayer.status}
                  </span>
                  {displayPlayer.rank && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={rankStyle(displayPlayer.rank)}
                    >
                      Nivå {displayPlayer.rank}
                    </span>
                  )}
                </div>
              </div>
              {!editing && canEdit() && (
                <button
                  onClick={handleEdit}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Redigera spelare"
                >
                  <Edit2 className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Statistik */}
          <div className="flex min-w-0 flex-col gap-3 md:col-start-2 md:row-span-2 md:row-start-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">Period</span>
              {PERIODS.map((p) => (
                <button key={p.months} type="button" onClick={() => changeMonths(p.months)}
                  className={cn('whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    months === p.months ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  {p.label}
                </button>
              ))}
            </div>
            <StatsSummary data={stats.data} loading={stats.loading} />
            <PlayerStats data={stats.data} loading={stats.loading} />
          </div>

          {/* Edit / View form */}
          <div ref={infoRef} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4 scroll-mt-4 md:col-start-1 md:row-start-2">
            <h2 className="text-sm font-semibold text-foreground">Information</h2>

            {editing && form ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Förnamn</Label>
                    <Input
                      value={form.firstname}
                      onChange={e => setField('firstname', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Efternamn</Label>
                    <Input
                      value={form.lastname}
                      onChange={e => setField('lastname', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Smeknamn</Label>
                    <Input
                      value={form.shortname}
                      onChange={e => setField('shortname', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Tröjnummer</Label>
                    <Input
                      type="number"
                      value={form.number ?? ''}
                      onChange={e => setField('number', e.target.value ? Number(e.target.value) : null)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Födelsedag</Label>
                    <DatePicker
                      value={form.birthdate}
                      onChange={v => setField('birthdate', v || null)}
                      fromYear={new Date().getFullYear() - 80}
                      toYear={new Date().getFullYear()}
                      placeholder="Välj"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={v => setField('status', v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Nivå</Label>
                    <Select value={form.rank ?? '__none__'} onValueChange={v => setField('rank', v === '__none__' ? null : v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Välj nivå" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">–</SelectItem>
                        {RANK_OPTIONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Fot</Label>
                    <Select value={form.foot ?? '__none__'} onValueChange={v => setField('foot', v === '__none__' ? null : v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Välj fot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">–</SelectItem>
                        {FOOT_OPTIONS.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Kön</Label>
                  <div className="flex gap-1 rounded-lg bg-muted p-1">
                    {['Pojke', 'Flicka'].map(g => (
                      <button key={g} type="button" onClick={() => setField('gender', form.gender === g ? null : g)}
                        className={`flex-1 rounded-md px-3 py-1 text-sm font-medium ${form.gender === g ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {([['shirt_size', 'Tröja', 'sizes-wear'], ['shorts_size', 'Shorts', 'sizes-wear'], ['sock_size', 'Strumpor', 'sizes-socks']] as const).map(([key, label, list]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input value={form[key] ?? ''} list={list} maxLength={12} placeholder="–"
                        onChange={e => setField(key, e.target.value || null)} className="h-9 text-sm" />
                    </div>
                  ))}
                  <datalist id="sizes-wear">{['116', '128', '140', '152', '164', '176', 'XS', 'S', 'M', 'L', 'XL'].map(v => <option key={v} value={v} />)}</datalist>
                  <datalist id="sizes-socks">{['27–30', '31–34', '35–38', '39–42', '43–46'].map(v => <option key={v} value={v} />)}</datalist>
                </div>

                {/* Profile image */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Profilbild</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-muted border border-border">
                      {form.img ? (
                        <img src={form.img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <Input
                      value={form.img ?? ''}
                      onChange={e => setField('img', e.target.value || null)}
                      className="h-9 text-sm flex-1"
                      placeholder="https://..."
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImg}
                      className="h-9 shrink-0 gap-1.5"
                    >
                      {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingImg ? 'Laddar…' : 'Ladda upp'}
                    </Button>
                  </div>
                </div>

                {/* Positions */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Positioner</Label>
                  <div className="flex flex-wrap gap-2">
                    {POSITIONS.map(pos => (
                      <button
                        key={pos.key}
                        type="button"
                        onClick={() => togglePosition(pos.key)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                          form[pos.key]
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Kommentar</Label>
                  <Textarea
                    value={form.comment ?? ''}
                    onChange={e => setField('comment', e.target.value || null)}
                    className="text-sm resize-none"
                    rows={3}
                    placeholder="Lägg till kommentar..."
                  />
                </div>

                {saveError && (
                  <p className="text-xs text-destructive">{saveError}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 h-9 text-sm gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Sparar...' : 'Spara'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 h-9 text-sm gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    Avbryt
                  </Button>
                </div>
              </>
            ) : (
              <>
                {saved && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ändringar sparade
                  </p>
                )}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <InfoRow label="Förnamn" value={player?.firstname ?? null} />
                  <InfoRow label="Efternamn" value={player?.lastname ?? null} />
                  <InfoRow label="Smeknamn" value={player?.shortname ?? null} />
                  <InfoRow label="Tröjnummer" value={player?.number != null ? String(player.number) : null} />
                  <InfoRow label="Födelsedag" value={player?.birthdate ? player.birthdate.slice(0, 10) : null} />
                  <InfoRow label="Nivå" value={player?.rank ?? null} />
                  <InfoRow label="Fot" value={player?.foot ?? null} />
                  <InfoRow label="Kön" value={player?.gender ?? null} />
                  <InfoRow label="Tröja" value={player?.shirt_size ?? null} />
                  <InfoRow label="Shorts" value={player?.shorts_size ?? null} />
                  <InfoRow label="Strumpor" value={player?.sock_size ?? null} />
                </div>

                {/* Positions */}
                {(() => {
                  const activePosLabels = POSITIONS
                    .filter(pos => player?.[pos.key])
                    .map(pos => pos.label)
                  return activePosLabels.length > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Positioner</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activePosLabels.map(label => (
                          <span key={label} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {player?.comment && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Kommentar</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{player.comment}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? '–'}</p>
    </div>
  )
}
