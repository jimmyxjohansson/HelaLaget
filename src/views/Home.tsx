'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGetTrainings } from '../hooks/backend/trainings'
import { useGetUpcomingMatches } from '../hooks/backend/matches'
import { useGetUpcomingBirthdays } from '../hooks/backend/players'
import { trainingTypeColor } from '../utils/trainingTypeColor'
import { MapPin, ChevronRight, Home as HomeIcon, Plane, Cake } from 'lucide-react'
import { ownTeamName } from '../utils/constants'
import { wallDayIso } from '../utils/dateWindow'

function matchTypeColor(type: string): string {
  if (type === 'Serie') return '#2563eb'
  if (type === 'Cup') return '#d97706'
  if (type === 'Träning') return '#7c3aed'
  return '#6b7280'
}

function parseTeamSuffix(teamname: string | null) {
  if (!teamname) return null
  const parts = teamname.split(':')
  return parts[1]?.trim() || null
}

interface Training {
  id: number
  type: string
  date1: string
  date: string
  indooroutdoor: string
  notes: string | null
  reported: boolean
  present_count: string
  absent_count: string
  total_registered: string
  p_narvarande: string
  p_anmald: string
  p_kallad: string
  p_ej: string
  l_narvarande: string
  l_anmald: string
  l_kallad: string
  l_ej: string
}

interface Match {
  id: number
  matchtype: string
  date: string
  homeaway: string
  indooroutdoor: string
  outcome: string
  status: string
  location: string | null
  notes: string | null
  teamname: string | null
  opponent: string | null
  opponent_img: string | null
  league_name: string | null
  cup: number | null
  cupphase: string | null
}

interface Birthday {
  id: number
  firstname: string
  lastname: string
  shortname: string | null
  img: string | null
  number: number | null
  birthdate: string
  next_birthday: string
  turning_age: number
  days_until: number
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('sv-SE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  })
}

function birthdayLabel(daysUntil: number, nextBirthday: string): string {
  if (daysUntil === 0) return 'Idag'
  if (daysUntil === 1) return 'Imorgon'
  return `${formatDate(nextBirthday)} (om ${daysUntil} dagar)`
}

export default function Home() {
  const { data: trainings, loading: trainingsLoading, trigger: triggerTrainings } = useGetTrainings()
  const { data: upcomingMatches, loading: matchesLoading, trigger: triggerMatches } = useGetUpcomingMatches()
  const { data: birthdaysData, trigger: triggerBirthdays } = useGetUpcomingBirthdays()
  const router = useRouter()

  const typedTrainings = trainings as unknown as Training[] | undefined

  useEffect(() => {
    // Bara intervallet som visas, så att importerade träningar långt fram inte tränger undan veckans
    triggerTrainings({ limit: 200, from: wallDayIso(0), to: wallDayIso(8) })
    triggerMatches({ limit: 10 })
    triggerBirthdays({ days: 14 })
  }, [])

  const typedMatches = upcomingMatches as unknown as Match[] | undefined
  const birthdays = birthdaysData as unknown as Birthday[] | undefined

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const upcomingWeek = (typedTrainings ?? [])
    .filter(t => {
      const d = new Date(t.date)
      return d >= now && d <= in7Days
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="text-team-accent px-4 pt-6 pb-3" style={{ backgroundColor: 'rgb(var(--team-primary))' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-team-accent/70 text-sm font-medium uppercase tracking-widest">{ownTeamName()}</p>
            <h1 className="text-2xl font-bold mt-0.5">P-13</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Upcoming 7 days */}
        {!trainingsLoading && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Kommande träningar</h2>
            {upcomingWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Inga träningar de närmaste 7 dagarna</p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingWeek.map(t => (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/trainings/${t.id}`)}
                    className={`w-full text-left border rounded-xl px-3 py-2.5 flex flex-col gap-1.5 ${
                      t.reported
                        ? 'bg-green-500/15 border-green-500/30'
                        : 'bg-primary/10 border-primary/20'
                    }`}
                  >
                    {/* Row 1: info + arrow */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="text-xs font-semibold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: trainingTypeColor(t.type) }}>{t.type}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{t.indooroutdoor}</span>
                        <span className="text-sm font-bold text-foreground capitalize">{formatDate(t.date)}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(t.date)}</span>
                        {t.notes && <span className="text-xs text-muted-foreground italic truncate">{t.notes}</span>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    {/* Row 2: status badges */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { p: t.p_narvarande, l: t.l_narvarande, color: '#008000' },
                        { p: t.p_anmald,     l: t.l_anmald,     color: '#0000FF' },
                        { p: t.p_ej,         l: t.l_ej,         color: '#FF0000' },
                        { p: t.p_kallad,     l: t.l_kallad,     color: '#9333ea' },
                      ].map((s, i) => (
                        <span key={i} className="text-xs font-bold text-white rounded px-1.5 py-0.5 text-center" style={{ backgroundColor: s.color }}>
                          {s.p}<span className="opacity-75">+{s.l}</span>
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming matches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kommande matcher</h2>
            <button
              onClick={() => router.push('/matches')}
              className="text-xs text-primary font-medium flex items-center gap-0.5"
            >
              Se alla <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {matchesLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-xl h-16 animate-pulse" />)}
            </div>
          ) : !typedMatches?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Inga kommande matcher</p>
          ) : (
            <div className="flex flex-col gap-2">
              {typedMatches.map(m => {
                const teamSuffix = parseTeamSuffix(m.teamname)
                return (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/matches/${m.id}`)}
                    className="w-full text-left bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
                  >
                    {/* Row 1: opponent + arrow */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Opponent logo */}
                        {m.opponent_img ? (
                          <img
                            src={m.opponent_img}
                            alt={m.opponent ?? ''}
                            className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0 bg-muted"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-foreground truncate">{m.opponent ?? '–'}</span>
                            {teamSuffix && (
                              <span className="text-xs text-muted-foreground">{teamSuffix}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span
                              className="text-xs font-semibold text-white px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: matchTypeColor(m.matchtype) }}
                            >
                              {m.matchtype}
                            </span>
                            {m.homeaway === 'Hemma'
                              ? <span className="text-xs text-muted-foreground flex items-center gap-0.5"><HomeIcon className="w-3 h-3" />Hemma</span>
                              : <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Plane className="w-3 h-3" />Borta</span>
                            }
                            <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(m.date)}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>

                    {/* Row 2: extra info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.league_name && (
                        <span className="text-xs text-muted-foreground">{m.league_name}</span>
                      )}
                      {m.location && m.location !== '-' && m.location !== '' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{m.location}
                        </span>
                      )}
                      {m.notes && (
                        <span className="text-xs text-muted-foreground italic">{m.notes}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

        </div>
{/* Birthdays in the coming two weeks */}
        {birthdays && birthdays.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Kommande födelsedagar
            </h2>
            <div className="flex flex-col gap-2">
              {birthdays.map(b => (
                <button
                  key={b.id}
                  onClick={() => router.push(`/players/${b.id}`)}
                  className="w-full text-left bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-3"
                >
                  {b.img ? (
                    <img
                      src={b.img}
                      alt={b.shortname ?? ''}
                      className="w-9 h-9 rounded-full object-cover bg-muted flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                      {b.number ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {b.shortname ?? `${b.firstname} ${b.lastname}`}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Cake className="w-3 h-3" />
                      {birthdayLabel(b.days_until, b.next_birthday)} · fyller {b.turning_age}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
