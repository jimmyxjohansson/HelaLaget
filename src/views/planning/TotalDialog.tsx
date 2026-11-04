'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ImageIcon, Loader2, Plus } from 'lucide-react'
import { useAddPlanningPlayers, useGetPlanningCandidates } from '../../hooks/backend/planning'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { CandidateList } from './SlotColumn'
import { answerHex, type Kind } from './shared'
import { ShareImageBar } from './OverviewDialog'
import { drawTotal } from './totalImage'
import { currentSquad } from '../../lib/squad-store'
import { byGender, genderSummary } from '../../utils/gender'

/** Spelare som inte är kallade till någon av kolumnernas matcher/cuper. */
export default function TotalDialog({
  kind,
  slots,
  open,
  from,
  playerStatuses,
  genders,
  mixed,
  onClose,
  onChanged,
}: {
  kind: Kind
  slots: { index: number; id: number; title: string }[]
  open: boolean
  from: string | null
  playerStatuses: string[]
  genders: string[]
  mixed: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const candidates = useGetPlanningCandidates()
  const add = useAddPlanningPlayers()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [asImage, setAsImage] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ids = slots.map((s) => s.id)
  const key = `${ids.join(',')}|${from}|${playerStatuses.join(',')}`

  function load() {
    return candidates.trigger({ kind, eventIds: ids, from, playerStatuses }).catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setError(null)
    setAsImage(false)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, kind])

  async function addTo(id: number) {
    setError(null)
    try {
      await add.trigger({ kind, id, playerIds: Array.from(selected) })
      setSelected(new Set())
      await load()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  const rows = byGender(candidates.data ?? [], genders)
  const noun = kind === 'match' ? 'match' : 'cup'
  const squad = currentSquad()
  const heading = `Ej kallade till någon ${noun} (${rows.length}${mixed && genderSummary(rows) ? ` · ${genderSummary(rows)}` : ''})`
  const imageTitle = `${squad ? `${squad.organizationName} ${squad.squadName}` : 'Hela Laget'} · Ej kallade`
  const fileName = `ej-kallade-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })}.png`
  const rowsKey = rows.map((r) => r.id).join(',')

  // Bilden ritas om när listan ändras medan bildläget är öppet
  useEffect(() => {
    if (!asImage || !candidates.data) return
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    drawTotal(canvas, rows, {
      heading: `Kvar att kalla (${rows.length})`,
      primary: squad?.primaryColor || '#24282E',
      accent: squad?.accentColor || '#FFFFFF',
      mixed,
    })
    setPreview(canvas.toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asImage, rowsKey, candidates.data, mixed])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-[520px] overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            {asImage && (
              <button type="button" onClick={() => setAsImage(false)} aria-label="Tillbaka till listan" title="Tillbaka till listan"
                className="-ml-1 rounded-md p-1 hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="min-w-0 flex-1">{asImage ? 'Bild att skicka' : heading}</span>
            {!asImage && slots.length > 0 && (
              <button type="button" onClick={() => { setPreview(null); setAsImage(true) }} disabled={!candidates.data}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-normal hover:bg-muted disabled:opacity-50">
                <ImageIcon className="h-3.5 w-3.5" /> Bild
              </button>
            )}
          </DialogTitle>
        </DialogHeader>
        {asImage ? (
          <>
            <ShareImageBar canvas={canvasRef} ready={!!preview} fileName={fileName} title={imageTitle} />
            {!preview ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Spelare som inte är kallade" className="mx-auto w-full max-w-[380px] rounded-lg border border-border" />
            )}
          </>
        ) : (<>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 bg-background pb-2">
          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">Välj {kind === 'match' ? 'matcher' : 'cuper'} i kolumnerna först.</p>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {selected.size > 0 ? `Lägg ${selected.size} som förslag i:` : 'Markera spelare och lägg dem i:'}
              </span>
              {slots.map((s) => (
                <button key={s.id} type="button" disabled={selected.size === 0 || add.loading} onClick={() => addTo(s.id)}
                  className="flex max-w-[11rem] items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: answerHex('Förslag') }} title={s.title}>
                  <Plus className="h-3 w-3 shrink-0" /> <span className="truncate">{s.index + 1}. {s.title}</span>
                </button>
              ))}
            </>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {candidates.loading && rows.length === 0 ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <CandidateList rows={rows} selected={selected} mixed={mixed}
            onToggle={(id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })} />
        )}
        </>)}
      </DialogContent>
    </Dialog>
  )
}
