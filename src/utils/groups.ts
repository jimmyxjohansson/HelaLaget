/** Automatisk gruppindelning för träningar. Ren logik utan React, så att den går att testa. */

export type GroupMethod = 'rank' | 'rank-equal' | 'random-balanced' | 'random'

export type GroupPlayer = { player_id: number; rank: string | null; goalkeeper?: boolean | null }

export type GroupOptions = {
  method: GroupMethod
  /** Antal grupper för utespelarna */
  groups: 2 | 3
  /** Målvakter i en egen grupp efter utespelarnas */
  separateGoalkeepers: boolean
}

export type GroupResult = {
  /** "Grupp 1" … */
  name: string
  /** Rank som gruppen tränar på (A/B/C), eller null om blandad */
  grouprank: string | null
  playerIds: number[]
  goalkeepers?: boolean
}[]

export const METHODS: { value: GroupMethod; label: string; help: string }[] = [
  { value: 'rank', label: 'Efter rank', help: 'Grupper efter nivå. Storleken följer hur många som har varje rank.' },
  { value: 'rank-equal', label: 'Efter rank, lika stora', help: 'Spelarna sorteras på rank och delas i lika stora grupper.' },
  { value: 'random-balanced', label: 'Slumpat, jämn rank', help: 'Slumpad indelning med ungefär lika många från varje rank i varje grupp.' },
  { value: 'random', label: 'Helt slumpat', help: 'Helt slumpad indelning i lika stora grupper.' },
]

const RANK_ORDER: Record<string, number> = { A: 0, AB: 1, B: 2, BC: 3, C: 4, CD: 5, D: 6, X: 7 }
const rankIndex = (r: string | null) => (r ? RANK_ORDER[r.toUpperCase()] ?? 8 : 8)

/** Fasta nivåer för "Efter rank": 2 grupper A–AB | B och lägre, 3 grupper A–AB | B–BC | C och lägre. */
export function rankTier(rank: string | null, groups: 2 | 3) {
  const i = rankIndex(rank)
  if (i <= 1) return 0
  if (groups === 2) return 1
  return i <= 3 ? 1 : 2
}

export const TIER_LABEL: Record<2 | 3, string[]> = {
  2: ['A–AB', 'B och lägre'],
  3: ['A–AB', 'B–BC', 'C och lägre'],
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Sortera på rank, slumpad ordning inom samma rank. */
function byRank<T extends GroupPlayer>(list: T[], random: () => number): T[] {
  return shuffle(list, random).sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank))
}

export function makeGroups(players: GroupPlayer[], opts: GroupOptions, random: () => number = Math.random): GroupResult {
  const n = opts.groups
  const keepers = opts.separateGoalkeepers ? players.filter((p) => p.goalkeeper) : []
  const field = opts.separateGoalkeepers ? players.filter((p) => !p.goalkeeper) : players
  const buckets: number[][] = Array.from({ length: n }, () => [])

  if (opts.method === 'rank') {
    for (const p of byRank(field, random)) buckets[rankTier(p.rank, n)].push(p.player_id)
  } else if (opts.method === 'rank-equal') {
    // Sammanhängande bitar av rank-ordningen; de första grupperna får en extra vid udda antal
    const sorted = byRank(field, random)
    let start = 0
    for (let g = 0; g < n; g++) {
      const size = Math.floor(sorted.length / n) + (g < sorted.length % n ? 1 : 0)
      buckets[g] = sorted.slice(start, start + size).map((p) => p.player_id)
      start += size
    }
  } else if (opts.method === 'random-balanced') {
    // Rank för rank till den minsta gruppen: jämn storlek och jämn rankfördelning
    for (const p of byRank(field, random)) {
      const min = Math.min(...buckets.map((b) => b.length))
      const smallest = buckets.map((b, i) => (b.length === min ? i : -1)).filter((i) => i >= 0)
      buckets[smallest[Math.floor(random() * smallest.length)]].push(p.player_id)
    }
  } else {
    shuffle(field, random).forEach((p, i) => buckets[i % n].push(p.player_id))
  }

  const rankGroups = opts.method === 'rank' || opts.method === 'rank-equal'
  const result: GroupResult = buckets.map((ids, i) => ({
    name: `Grupp ${i + 1}`,
    grouprank: rankGroups ? (['A', 'B', 'C'][i] ?? null) : null,
    playerIds: ids,
  }))
  if (keepers.length) {
    result.push({ name: `Grupp ${n + 1}`, grouprank: null, playerIds: keepers.map((p) => p.player_id), goalkeepers: true })
  }
  return result
}
