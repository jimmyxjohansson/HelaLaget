'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, Shield } from 'lucide-react'
import { useCreateTeam } from '../hooks/backend/matches'
import { useUploadTeamLogo } from '../hooks/backend/teams'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../lib/shadcn/dialog'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export interface CreatedTeam {
  id: number
  team: string
  imgurl: string | null
  country: string | null
}

interface AddTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (team: CreatedTeam) => void
  initialName?: string
}

export function AddTeamDialog({ open, onOpenChange, onCreated, initialName = '' }: AddTeamDialogProps) {
  const { loading, trigger: create } = useCreateTeam()
  const { trigger: uploadLogo } = useUploadTeamLogo()
  const [team, setTeam] = useState(initialName)
  const [imgurl, setImgurl] = useState<string | null>(null)
  const [country, setCountry] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTeam('')
    setImgurl(null)
    setCountry('')
    setError(null)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const base64 = await fileToBase64(file)
      const res = await uploadLogo({
        fileName: file.name,
        data: base64,
        mimeType: file.type || 'application/octet-stream',
      })
      setImgurl((res as unknown as { url: string }).url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda upp logotyp.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!team.trim()) {
      setError('Ange ett lagnamn.')
      return
    }
    setError(null)
    try {
      const created = (await create({
        team: team.trim(),
        imgurl: imgurl || null,
        country: country.trim() || null,
      })) as unknown as CreatedTeam | undefined
      if (created?.id) {
        onCreated(created)
        reset()
        onOpenChange(false)
      } else {
        setError('Kunde inte skapa laget.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lägg till lag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Lagnamn</Label>
            <Input
              value={team}
              onChange={e => setTeam(e.target.value)}
              placeholder="t.ex. IFK Göteborg"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Logga</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {imgurl ? (
                  <img
                    src={imgurl}
                    alt=""
                    className="w-11 h-11 rounded-lg object-contain bg-muted"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                {imgurl && (
                  <button
                    onClick={() => setImgurl(null)}
                    aria-label="Ta bort logotyp"
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Laddar upp...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Ladda upp logotyp</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Sparas i mappen "Lag"</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Land</Label>
            <Input
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="t.ex. Sverige"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={loading || uploading}>
            {loading ? 'Sparar…' : 'Lägg till'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
