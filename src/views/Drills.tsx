'use client'

import { useEffect, useState } from 'react'
import { useGetDrills } from '../hooks/backend/drills'
import { Search, Play, Users, BookOpen } from 'lucide-react'

interface Drill {
  id: number
  name: string
  videourl: string
  minimumplayers: string
  category: unknown
}

function parseCategories(cat: unknown): string[] {
  if (!cat) return []
  const raw = String(cat).trim()
  if (!raw || raw === '{}' || raw === '') return []
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1)
    return inner.split(',').map(s => s.replace(/"/g, '').trim()).filter(Boolean)
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function getYoutubeThumbnail(url: string): string | null {
  try {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    if (match?.[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
    }
  } catch (_) { /* noop */ }
  return null
}

function DrillCard({ d }: { d: Drill }) {
  const hasVideo = d.videourl && d.videourl.trim() !== ''
  const thumb = hasVideo ? getYoutubeThumbnail(d.videourl) : null
  const minPlayers = d.minimumplayers && d.minimumplayers.trim() !== '' ? d.minimumplayers : null
  const cats = parseCategories(d.category)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {thumb && (
        <div className="relative">
          <img src={thumb} alt={d.name} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <a
              href={d.videourl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center"
            >
              <Play className="w-5 h-5 text-foreground fill-foreground ml-0.5" />
            </a>
          </div>
        </div>
      )}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">{d.name}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {minPlayers && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Min. {minPlayers} spelare
            </span>
          )}
          {hasVideo && !thumb && (
            <a
              href={d.videourl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary"
            >
              <Play className="w-3 h-3" /> Visa video
            </a>
          )}
        </div>
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cats.map(c => (
              <span key={c} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Drills() {
  const { data, loading, trigger } = useGetDrills()
  const [search, setSearch] = useState('')

  useEffect(() => { trigger({}) }, [])

  const drills = data as unknown as Drill[] | undefined

  const filtered = (drills ?? []).filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return d.name.toLowerCase().includes(q)
  })

  const withVideo = filtered.filter(d => d.videourl && d.videourl.trim() !== '')
  const withoutVideo = filtered.filter(d => !d.videourl || d.videourl.trim() === '')

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Övningar</h1>
            <p className="text-team-accent/70 text-sm">{filtered.length} övningar</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök övning..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border border-transparent focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Inga övningar hittades</p>
        ) : (
          <>
            {withVideo.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-3.5 h-3.5 text-muted-foreground" />
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Med video ({withVideo.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {withVideo.map(d => <DrillCard key={d.id} d={d} />)}
                </div>
              </div>
            )}
            {withoutVideo.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Övriga ({withoutVideo.length})
                  </h2>
                </div>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {withoutVideo.map(d => {
                    const cats = parseCategories(d.category)
                    return (
                      <div key={d.id} className="px-4 py-3 flex items-start gap-3">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col min-w-0 gap-1">
                          <span className="text-sm font-medium text-foreground">{d.name}</span>
                          {d.minimumplayers && d.minimumplayers.trim() !== '' && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" /> Min. {d.minimumplayers} spelare
                            </span>
                          )}
                          {cats.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {cats.map(c => (
                                <span key={c} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
