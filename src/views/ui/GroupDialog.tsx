'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Shuffle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { Button } from '../../lib/shadcn/button'
import { cn } from '../../lib/shadcn/utils'
import { rankStyle } from '../../utils/rankColors'
import { GENDER_MODES, GROUP_COUNTS, makeGroups, METHODS, TIER_LABEL, type GenderMode, type GroupCount, type GroupMethod, type GroupResult } from '../../utils/groups'
import { genderSummary, isMixed } from '../../utils/gender'
import GenderBadge from '../../components/GenderBadge'

type Player = {
  player_id: number
  shortname: string
  rank: string | null
  status: string
  goalkeeper?: boolean | null
  gender?: string | null
}

/** Anmälda = Anmäld eller Närvarande. Inbjudna = Kallad. */
const REGISTERED = ['Anmäld', 'Närvarande']
const INVITED = ['Kallad']

/**
 * Dela in spelarna i grupper på fyra sätt, med förhandsvisning innan något
 * sparas. Spelare som inte tas med tas bort ur sina grupper.
 */
export default function GroupDialog({
  open,
  onOpenChange,
  participants,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Player[]
  onSave: (groups: GroupResult, clearIds: number[]) => Promise<void>
}) {
  const [method, setMethod] = useState<GroupMethod>('rank-equal')
  const [groups, setGroups] = useState<GroupCount>(2)
  const [separateGk, setSeparateGk] = useState(true)
  const [genderMode, setGenderMode] = useState<GenderMode>('ignore')
  const [includeInvited, setIncludeInvited] = useState(false)
  const [seed, setSeed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Listan från föräldern är en ny array vid varje rendering; nyckeln gör att
  // förhandsvisningen bara slumpas om när spelarna faktiskt ändras.
  const participantKey = participants.map((p) => `${p.player_id}:${p.status}:${p.rank}:${p.goalkeeper}:${p.gender}`).join(',')
  const included = useMemo(
    () => participants.filter((p) => REGISTERED.includes(p.status) || (includeInvited && INVITED.includes(p.status))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [participantKey, includeInvited],
  )
  // Jämför på id: listan från föräldern byts ut när grupperna laddas om
  const includedIds = new Set(included.map((p) => p.player_id))
  const excluded = participants.filter((p) => !includedIds.has(p.player_id))
  const keeperCount = included.filter((p) => p.goalkeeper).length
  // Valet om kön visas bara när det finns både pojkar och flickor bland spelarna
  const mixed = isMixed(included)
  const rankMethod = method === 'rank' || method === 'rank-equal'
  const effectiveGender: GenderMode = !mixed ? 'ignore' : genderMode === 'balanced' && rankMethod ? 'ignore' : genderMode

  // Ny slumpning när något ändras eller man trycker på "Slumpa igen"
  const result = useMemo(
    () => makeGroups(included, { method, groups, separateGoalkeepers: separateGk, gender: effectiveGender }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [included, method, groups, separateGk, effectiveGender, seed],
  )

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  const byId = new Map(participants.map((p) => [p.player_id, p]))

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(result.filter((g) => g.playerIds.length > 0), excluded.map((p) => p.player_id))
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara grupperna.')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (on: boolean) =>
    cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', on ? 'bg-background shadow-sm' : 'text-muted-foreground')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[480px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>Dela in i grupper</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={cn(
                'rounded-lg border p-2.5 text-left transition-colors',
                method === m.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
              )}
            >
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-xs text-muted-foreground">
                {m.value === 'rank' ? `${m.help} ${TIER_LABEL[groups].join(' | ')}.` : m.help}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Antal grupper{separateGk ? ' (plus gruppen Målvakter)' : ''}</p>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {GROUP_COUNTS.map((n) => (
              <button key={n} type="button" onClick={() => setGroups(n)} className={toggle(groups === n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button type="button" onClick={() => setIncludeInvited(false)} className={toggle(!includeInvited)}>
              Bara anmälda
            </button>
            <button type="button" onClick={() => setIncludeInvited(true)} className={toggle(includeInvited)}>
              Anmälda och inbjudna
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={separateGk} onChange={(e) => setSeparateGk(e.target.checked)} />
            Målvakter i egen grupp
            <span className="text-xs text-muted-foreground">
              ({keeperCount === 1 ? '1 målvakt' : `${keeperCount} målvakter`} enligt spelarkortet)
            </span>
          </label>
          {mixed && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Kön ({genderSummary(included)})</p>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {GENDER_MODES.map((g) => {
                  const disabled = g.value === 'balanced' && rankMethod
                  return (
                    <button key={g.value} type="button" disabled={disabled} onClick={() => setGenderMode(g.value)}
                      title={disabled ? 'Fungerar med de slumpade metoderna' : g.help}
                      className={cn(toggle(effectiveGender === g.value), 'px-2 text-xs disabled:opacity-40')}>
                      {g.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {genderMode === 'balanced' && rankMethod
                  ? 'Jämn fördelning av kön fungerar med de slumpade metoderna. Med rank styr nivån indelningen.'
                  : GENDER_MODES.find((g) => g.value === effectiveGender)?.help}
              </p>
            </div>
          )}
        </div>

        {/* Förhandsvisning */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Förhandsvisning ({included.length} spelare)
            </p>
            <button type="button" onClick={() => setSeed((s) => s + 1)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted">
              <Shuffle className="h-3.5 w-3.5" /> Slumpa igen
            </button>
          </div>
          {result.filter((g) => g.playerIds.length > 0).map((g) => (
            <div key={g.name} className="rounded-lg border border-border p-2">
              <p className="mb-1.5 text-xs font-semibold">
                {g.name} <span className="font-normal text-muted-foreground">({g.playerIds.length}{mixed && genderSummary(g.playerIds.map((id) => byId.get(id)!)) ? ` · ${genderSummary(g.playerIds.map((id) => byId.get(id)!))}` : ''})</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {g.playerIds
                  .map((id) => byId.get(id)!)
                  .sort((a, b) => (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv'))
                  .map((p) => (
                    <span key={p.player_id} className="flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2 pr-1 text-xs">
                      {p.shortname}
                      {mixed && <GenderBadge gender={p.gender} />}
                      <span className="rounded px-1 text-[9px] font-bold" style={p.rank ? rankStyle(p.rank) : { backgroundColor: '#B7B7B7', color: '#fff' }}>
                        {p.rank ?? '–'}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {included.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Inga {includeInvited ? 'anmälda eller inbjudna' : 'anmälda'} spelare.
            </p>
          )}
          {excluded.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {excluded.length} {excluded.length === 1 ? 'spelare' : 'spelare'} tas inte med och tas bort ur sina grupper.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={save} disabled={saving || included.length === 0}>
            {saving && <Loader2 className="animate-spin" />} Spara grupper
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
