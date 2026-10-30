'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useGetPlayer, useUpdatePlayer, useUploadPlayerImage } from '../hooks/backend/players'
import { ArrowLeft, Edit2, Check, X, User, Upload, Loader2 } from 'lucide-react'
import { rankStyle } from '../utils/rankColors'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'

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
  sessions_attended: string
  total_sessions: string
}

function pct(attended: string, total: string) {
  const t = Number(total)
  if (!t) return 0
  return Math.round((Number(attended) / t) * 100)
}

function pctColor(n: number) {
  if (n >= 75) return 'text-green-600 dark:text-green-400'
  if (n >= 50) return 'text-orange-500'
  return 'text-red-500'
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Match the training-attendance window used by the player list (defaults to 2 months).
  const monthsParam = searchParams.get('months')
  const months = monthsParam != null && monthsParam !== '' ? Number(monthsParam) : 2
  const { data, loading, trigger } = useGetPlayer()
  const { trigger: updateTrigger, loading: saving } = useUpdatePlayer()
  const { trigger: uploadImage, loading: uploadingImg } = useUploadPlayerImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PlayerData | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id) trigger({ id: Number(id), months })
  }, [id, months])

  const player = data as unknown as PlayerData | null | undefined

  useEffect(() => {
    if (player) setForm({ ...player })
  }, [player])

  function handleEdit() {
    if (player) setForm({ ...player })
    setEditing(true)
    setSaved(false)
    setSaveError(null)
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
  const attendPct = displayPlayer
    ? pct(displayPlayer.sessions_attended, displayPlayer.total_sessions)
    : 0

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

      {loading && (
        <div className="flex flex-col gap-4 p-4">
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
        </div>
      )}

      {!loading && displayPlayer && (
        <div className="flex flex-col gap-4 p-4 pb-6">
          {/* Profile card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Avatar row */}
            <div className="flex items-center gap-4 p-4 border-b border-border">
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
              {!editing && (
                <button
                  onClick={handleEdit}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Redigera spelare"
                >
                  <Edit2 className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Attendance stat */}
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="flex flex-col items-center py-3">
                <span className={`text-2xl font-bold ${pctColor(attendPct)}`}>{attendPct}%</span>
                <span className="text-xs text-muted-foreground mt-0.5">Närvaro</span>
              </div>
              <div className="flex flex-col items-center py-3">
                <span className="text-2xl font-bold text-foreground">{displayPlayer.sessions_attended}</span>
                <span className="text-xs text-muted-foreground mt-0.5">Pass</span>
              </div>
              <div className="flex flex-col items-center py-3">
                <span className="text-2xl font-bold text-foreground">{displayPlayer.total_sessions}</span>
                <span className="text-xs text-muted-foreground mt-0.5">Totalt</span>
              </div>
            </div>
          </div>

          {/* Edit / View form */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
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
                    <Input
                      type="date"
                      value={form.birthdate ? form.birthdate.slice(0, 10) : ''}
                      onChange={e => setField('birthdate', e.target.value || null)}
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
