/** Samma som percent i shared.tsx; här för att filen ska gå att köra utan React. */
const percent = (coming: number, total: number) => (total > 0 ? Math.round((coming / total) * 100) : null)

export type SuggestCandidate = {
  id: number
  shortname: string | null
  rank: string | null
  gender?: string | null
  canGoalkeeper: boolean
  coming: number
  total: number
  lastmatch: number | null
  matches: number
  cups: number
}

export type SuggestOptions = {
  /** Antal spelare totalt, målvakter inräknade */
  count: number
  /** Antal av dem som ska vara målvakter */
  keepers: number
  /** 'level': bara valda rank. 'mixed': jämnt fördelat mellan rankgrupperna. */
  mode: 'level' | 'mixed'
  /** Rank som får väljas i läget 'level' */
  ranks: string[]
  /** Hur mycket varje sak väger, 0–3 */
  weights: { games: number; recent: number; attendance: number }
  /** Lägsta träningsnärvaro i procent. Spelare utan träningar räknas inte bort. */
  minAttendance: number
  /** Jämn fördelning mellan pojkar och flickor */
  balanceGender: boolean
}

export type Suggestion = SuggestCandidate & { keeper: boolean; score: number; pct: number | null }

/** Rankgrupp för blandat urval: AB räknas till A, BC till B och så vidare. */
export function rankGroup(rank: string | null | undefined) {
  const r = (rank ?? '').toUpperCase()
  if (r.startsWith('A')) return 'A'
  if (r.startsWith('B')) return 'B'
  if (r.startsWith('C')) return 'C'
  if (r.startsWith('D')) return 'D'
  return '–'
}
const GROUPS = ['A', 'B', 'C', 'D', '–']

/**
 * Poäng 0–1 per sak, viktad: få matcher och cuper, länge sedan senaste match
 * (aldrig spelat räknas som längst sedan) och hög träningsnärvaro.
 */
function score(pool: SuggestCandidate[], w: SuggestOptions['weights']) {
  const games = pool.map((p) => p.matches + p.cups)
  const days = pool.map((p) => p.lastmatch).filter((d): d is number => d != null)
  const gMin = Math.min(...games), gMax = Math.max(...games)
  const dMin = days.length ? Math.min(...days) : 0, dMax = days.length ? Math.max(...days) : 0
  const sum = w.games + w.recent + w.attendance || 1
  return new Map(pool.map((p) => {
    const g = gMax > gMin ? 1 - (p.matches + p.cups - gMin) / (gMax - gMin) : 1
    const d = p.lastmatch == null ? 1 : dMax > dMin ? (p.lastmatch - dMin) / (dMax - dMin) : 1
    const pct = percent(p.coming, p.total)
    const a = pct == null ? 0 : pct / 100
    return [p.id, (w.games * g + w.recent * d + w.attendance * a) / sum]
  }))
}

/** Väljer spelare enligt valen. Ger färre än begärt om det inte finns fler som passar. */
export function suggestPlayers(candidates: SuggestCandidate[], o: SuggestOptions, excluded: Set<number> = new Set()): Suggestion[] {
  const ranks = new Set(o.ranks.map((r) => r.toUpperCase()))
  const pool = candidates.filter((p) => {
    if (excluded.has(p.id)) return false
    if (o.mode === 'level' && !ranks.has((p.rank ?? '').toUpperCase())) return false
    const pct = percent(p.coming, p.total)
    return pct == null || pct >= o.minAttendance
  })
  const scores = score(pool, o.weights)
  const best = (a: SuggestCandidate, b: SuggestCandidate) =>
    (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv')
  const chosen: Suggestion[] = []
  const take = (p: SuggestCandidate, keeper: boolean) =>
    chosen.push({ ...p, keeper, score: scores.get(p.id) ?? 0, pct: percent(p.coming, p.total) })

  // Målvakterna först, bland dem som kan stå i mål
  const keeperPool = pool.filter((p) => p.canGoalkeeper).sort(best)
  for (const p of keeperPool.slice(0, Math.max(0, o.keepers))) take(p, true)

  const rest = pool.filter((p) => !chosen.some((c) => c.id === p.id)).sort(best)
  const need = Math.max(0, o.count - chosen.length)

  // Kön: sikta på samma andel som bland de möjliga spelarna
  const genders = o.balanceGender ? Array.from(new Set(rest.map((p) => p.gender).filter(Boolean))) as string[] : []
  const target = new Map(genders.map((g) => [g, (rest.filter((p) => p.gender === g).length / (rest.length || 1)) * o.count]))
  const pickFrom = (list: SuggestCandidate[]) => {
    if (genders.length < 2) return list[0]
    // Det kön som ligger längst under sin andel går först, om det finns någon av det i listan
    const order = [...genders].sort((a, b) =>
      (chosen.filter((c) => c.gender === a).length - target.get(a)!) - (chosen.filter((c) => c.gender === b).length - target.get(b)!))
    for (const g of order) {
      const p = list.find((x) => x.gender === g)
      if (p) return p
    }
    return list[0]
  }

  if (o.mode === 'mixed') {
    // Turvis ur varje rankgrupp, A först, så att fördelningen blir jämn
    // Spelare utan rank tas bara när A–D inte räcker
    const buckets = GROUPS.filter((g) => g !== '–').map((g) => rest.filter((p) => rankGroup(p.rank) === g)).filter((b) => b.length)
    const unranked = rest.filter((p) => rankGroup(p.rank) === '–')
    let added = 0
    while (added < need && buckets.some((b) => b.length)) {
      for (const b of buckets) {
        if (added >= need || !b.length) continue
        const p = pickFrom(b)
        b.splice(b.indexOf(p), 1)
        take(p, false)
        added++
      }
    }
    while (added < need && unranked.length) {
      const p = pickFrom(unranked)
      unranked.splice(unranked.indexOf(p), 1)
      take(p, false)
      added++
    }
  } else {
    const list = [...rest]
    for (let i = 0; i < need && list.length; i++) {
      const p = pickFrom(list)
      list.splice(list.indexOf(p), 1)
      take(p, false)
    }
  }
  // Visas med målvakterna först, sedan rank och namn
  return chosen.sort((a, b) =>
    Number(b.keeper) - Number(a.keeper) || RANKS.indexOf(rankKey(a.rank)) - RANKS.indexOf(rankKey(b.rank)) ||
    (a.shortname ?? '').localeCompare(b.shortname ?? '', 'sv'))
}

const RANKS = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X', '']
const rankKey = (r: string | null) => (RANKS.includes((r ?? '').toUpperCase()) ? (r ?? '').toUpperCase() : 'X')

/** Standardantal efter spelform: 5 mot 5 → 8, 7 mot 7 → 11, 9 mot 9 → 13, 11 mot 11 → 16. */
export function defaultCount(matchplayers: string | null | undefined) {
  const n = Number((matchplayers ?? '').match(/\d+/)?.[0])
  return ({ 3: 5, 5: 8, 7: 11, 8: 12, 9: 13, 11: 16 } as Record<number, number>)[n] ?? 12
}
