'use client'

import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Input } from '../../lib/shadcn/input'
import { useSaveGameFormats } from '../../hooks/backend/members'
import { DEFAULT_FORMATS, GAME_FORMATS, type FormatDefault, type FormatDefaults } from '../../utils/gameFormats'
import { Section } from './shared'

/** "25 min × 3 perioder" */
export function formatText(d: FormatDefault | undefined) {
  if (!d || (d.playtime == null && d.periods == null)) return ''
  const parts: string[] = []
  if (d.playtime != null) parts.push(`${d.playtime} min`)
  if (d.periods != null) parts.push(`${d.periods} ${d.periods === 1 ? 'period' : 'perioder'}`)
  return parts.join(' × ')
}

type Row = { playtime: string; periods: string }
const toRows = (f: FormatDefaults) =>
  Object.fromEntries(GAME_FORMATS.map((k) => [k, {
    playtime: f[k]?.playtime != null ? String(f[k].playtime) : '',
    periods: f[k]?.periods != null ? String(f[k].periods) : '',
  }])) as Record<string, Row>

/** Föreningens speltid och perioder per spelform. Alla lag i föreningen använder dem. */
export default function GameFormats({ initial, canEdit, onSaved }: { initial: FormatDefaults; canEdit: boolean; onSaved: () => void }) {
  const save = useSaveGameFormats()
  const [rows, setRows] = useState(() => toRows(initial))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (f: string, key: keyof Row, v: string) => { setSaved(false); setRows({ ...rows, [f]: { ...rows[f], [key]: v } }) }
  const isDefault = (f: string) => {
    const d = DEFAULT_FORMATS[f]
    return rows[f].playtime === (d.playtime != null ? String(d.playtime) : '') && rows[f].periods === (d.periods != null ? String(d.periods) : '')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      const formats = Object.fromEntries(GAME_FORMATS.map((f) => [f, {
        playtime: rows[f].playtime === '' ? null : Number(rows[f].playtime),
        periods: rows[f].periods === '' ? null : Number(rows[f].periods),
      }]))
      const res = await save.trigger({ formats })
      if (res?.formats) setRows(toRows(res.formats))
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara.')
    }
  }

  return (
    <Section title="Spelformer">
      <p className="mb-3 text-sm text-muted-foreground">
        Speltid och perioder som nya matcher och cuper får för varje spelform. Gäller alla lag i föreningen.
        {!canEdit && ' Bara föreningens admins kan ändra dem.'}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-[4.5rem_1fr_1fr_2rem] items-center gap-x-2 gap-y-2 text-sm">
          <span />
          <span className="text-xs text-muted-foreground">Speltid (min)</span>
          <span className="text-xs text-muted-foreground">Perioder</span>
          <span />
          {GAME_FORMATS.map((f) => (
            <div key={f} className="contents">
              <span className="font-medium">{f}</span>
              <Input type="number" min={1} max={120} inputMode="numeric" value={rows[f].playtime} disabled={!canEdit}
                aria-label={`Speltid för ${f}`} placeholder="–" onChange={(e) => set(f, 'playtime', e.target.value)} className="h-8" />
              <Input type="number" min={1} max={10} inputMode="numeric" value={rows[f].periods} disabled={!canEdit}
                aria-label={`Perioder för ${f}`} placeholder="–" onChange={(e) => set(f, 'periods', e.target.value)} className="h-8" />
              {canEdit && !isDefault(f) ? (
                <button type="button" title="Återställ till appens standard" aria-label={`Återställ ${f} till appens standard`}
                  onClick={() => { setSaved(false); setRows({ ...rows, [f]: toRows(DEFAULT_FORMATS)[f] }) }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : <span />}
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.loading}>
              {save.loading && <Loader2 className="animate-spin" />}
              Spara spelformer
            </Button>
            {saved && <span className="text-sm text-success">Sparat</span>}
          </div>
        )}
      </form>
    </Section>
  )
}
