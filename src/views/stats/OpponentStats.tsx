'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import Link from '../../lib/nav'
import { useGetStatsOpponents } from '../../hooks/backend/stats'
import type { Filters } from './Statistics'

type Opponent = NonNullable<ReturnType<typeof useGetStatsOpponents>['data']>[number]

// Leaflet laddas från CDN först när kartan visas, så att resten av appen inte blir större.
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Leaflet = any
let leafletPromise: Promise<Leaflet> | null = null

function loadLeaflet(): Promise<Leaflet> {
  const w = window as unknown as { L?: Leaflet }
  if (w.L) return Promise.resolve(w.L)
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = `${LEAFLET}.css`
    document.head.appendChild(css)
    const script = document.createElement('script')
    script.src = `${LEAFLET}.js`
    script.async = true
    script.onload = () => resolve(w.L)
    script.onerror = () => {
      leafletPromise = null
      reject(new Error('Kunde inte ladda kartan.'))
    }
    document.head.appendChild(script)
  })
  return leafletPromise
}

/** Grönt när vi vunnit mest, rött när vi förlorat mest, annars grått. */
function balanceColor(o: Opponent) {
  if (o.won > o.lost) return '#059669'
  if (o.lost > o.won) return '#dc2626'
  return '#6b7280'
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function record(o: Opponent) {
  return `${o.won}–${o.drawn}–${o.lost}`
}

/** Karta över lagen vi mött under perioden, och en lista med resultaten. */
export default function OpponentStats({ filters }: { filters: Filters }) {
  const { data, loading, trigger } = useGetStatsOpponents()
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<Leaflet>(null)
  const layer = useRef<Leaflet>(null)
  const markers = useRef(new Map<number, Leaflet>())
  const [mapError, setMapError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    trigger({ from: filters.from, to: filters.to })
  }, [filters.from, filters.to, trigger])

  const all = useMemo(() => (data ?? []).filter((o) => !filters.search || (o.team ?? '').toLowerCase().includes(filters.search) || (o.city ?? '').toLowerCase().includes(filters.search)), [data, filters.search])
  const placed = all.filter((o) => o.lat != null && o.lng != null)
  const missing = all.filter((o) => o.lat == null || o.lng == null)

  // Kartan skapas en gång
  useEffect(() => {
    let cancelled = false
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || map.current) return
        map.current = L.map(mapEl.current, { scrollWheelZoom: false }).setView([55.9, 13.4], 8)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map.current)
        layer.current = L.layerGroup().addTo(map.current)
        setMapError(null)
        setReady(true)
      })
      .catch((e: Error) => setMapError(e.message))
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Nålar för lagen med koordinater; ett lag per ort sprids lite så att de inte täcker varandra
  const placedKey = placed.map((o) => `${o.id}:${o.matches}:${o.won}:${o.lost}`).join(',')
  useEffect(() => {
    const L = (window as unknown as { L?: Leaflet }).L
    if (!L || !map.current || !layer.current) return
    layer.current.clearLayers()
    markers.current.clear()
    const seen = new Map<string, number>()
    const max = Math.max(1, ...placed.map((o) => o.matches))
    for (const o of placed) {
      const key = `${o.lat!.toFixed(3)},${o.lng!.toFixed(3)}`
      const n = seen.get(key) ?? 0
      seen.set(key, n + 1)
      const angle = n * 2.4
      const offset = n ? 0.012 * Math.sqrt(n) : 0
      const pos = [o.lat! + offset * Math.sin(angle), o.lng! + offset * 1.8 * Math.cos(angle)]
      const marker = L.circleMarker(pos, {
        radius: 6 + 8 * Math.sqrt(o.matches / max),
        color: '#ffffff',
        weight: 2,
        fillColor: balanceColor(o),
        fillOpacity: 0.9,
      })
        .bindTooltip(escapeHtml(o.team ?? ''), { direction: 'top', offset: [0, -6] })
        .bindPopup(
          `<div style="min-width:150px"><strong>${escapeHtml(o.team ?? '')}</strong><br>` +
            `<span style="color:#6b7280">${escapeHtml(o.city ?? '')}</span><br>` +
            `${o.matches} ${o.matches === 1 ? 'match' : 'matcher'} · V–O–F ${record(o)}<br>` +
            `Mål ${o.goals_for}–${o.goals_against}</div>`,
        )
        .addTo(layer.current)
      markers.current.set(o.id, marker)
    }
    if (placed.length) {
      const bounds = L.latLngBounds(placed.map((o) => [o.lat!, o.lng!]))
      map.current.fitBounds(bounds.pad(0.25), { maxZoom: 10 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedKey, ready])

  function focus(o: Opponent) {
    const marker = markers.current.get(o.id)
    if (!marker || !map.current) return
    map.current.setView(marker.getLatLng(), Math.max(map.current.getZoom(), 10))
    marker.openPopup()
    mapEl.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div ref={mapEl} className="h-[340px] w-full bg-muted md:h-[460px]" />
        {(loading || (!ready && !mapError)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">{mapError}</div>
        )}
        <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] flex gap-2 rounded-md bg-background/90 px-2 py-1 text-[11px] shadow-sm">
          <Legend color="#059669" label="Mest vinster" />
          <Legend color="#6b7280" label="Jämnt" />
          <Legend color="#dc2626" label="Mest förluster" />
        </div>
      </div>

      {data && all.length === 0 && (
        <p className="text-sm text-muted-foreground">Inga spelade matcher mot lag i registret under perioden.</p>
      )}

      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {missing.length} lag saknar ort och syns inte på kartan:{' '}
          {missing.map((o) => o.team).join(', ')}.{' '}
          <Link href="/teams" className="font-medium underline underline-offset-2">Lägg till ort under Lag</Link>
        </div>
      )}

      {all.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Lag</th>
                <th className="px-2 py-2 text-right font-medium">M</th>
                <th className="px-2 py-2 text-right font-medium" title="Vinst–Oavgjort–Förlust">V–O–F</th>
                <th className="px-3 py-2 text-right font-medium">Mål</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {all.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => focus(o)}
                  className={o.lat != null ? 'cursor-pointer hover:bg-muted/40' : ''}
                >
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: balanceColor(o) }} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{o.team}</span>
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          {o.city ? <><MapPin className="h-3 w-3" />{o.city}</> : 'Ort saknas'}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{o.matches}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{record(o)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{o.goals_for}–{o.goals_against}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
