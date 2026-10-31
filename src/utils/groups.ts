import { GOALKEEPER_GROUP } from './trainingGroups'

export { GOALKEEPER_GROUP }

/** Automatisk gruppindelning för träningar. Ren logik utan React, så att den går att testa. */

export type GroupMethod = 'rank' | 'rank-equal' | 'random-balanced' | 'random'

export type GroupPlayer = { player_id: number; rank: string | null; goalkeeper?: boolean | null }

export type GroupCount = 2 | 3 | 4 | 5 | 6 | 7 | 8

export const GROUP_COUNTS: GroupCount[] = [2, 3, 4, 5, 6, 7, 8]


export type GroupOptions = {
  method: GroupMethod
  /** Antal grupper för utespelarna */
  groups: GroupCount
  /** Målvakter i en egen grupp, Målvakter */
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

/**
 * Fasta nivåer för "Efter rank": index i rankordningen A, AB, B, BC, C, CD, D
 * där varje nivå börjar. Spelare utan rank hamnar i sista nivån.
 */
const TIER_STARTS: Record<GroupCount, number[]> = {
  2: [0, 2], // A–AB | B och lägre
  3: [0, 2, 4], // A–AB | B–BC | C och lägre
  4: [0, 1, 3, 5], // A | AB–B | BC–C | CD och lägre
  5: [0, 1, 2, 3, 5], // A | AB | B | BC–C | CD och lägre
  6: [0, 1, 2, 3, 4, 5], // A | AB | B | BC | C | CD och lägre
  7: [0, 1, 2, 3, 4, 5, 6], // A | AB | B | BC | C | CD | D och lägre
  8: [0, 1, 2, 3, 4, 5, 6, 7], // A | AB | B | BC | C | CD | D | X och utan rank
}
const RANKS = ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'X']

export function rankTier(rank: string | null, groups: GroupCount) {
  const i = rankIndex(rank)
  const starts = TIER_STARTS[groups]
  let tier = 0
  starts.forEach((start, t) => {
    if (i >= start) tier = t
  })
  return tier
}

/** "A–AB", "B och lägre" … för varje nivå. */
export const TIER_LABEL: Record<GroupCount, string[]> = Object.fromEntries(
  GROUP_COUNTS.map((n) => {
    const starts = TIER_STARTS[n]
    return [n, starts.map((start, t) => {
      if (t === starts.length - 1) return RANKS[start] === 'X' ? 'X och utan rank' : `${RANKS[start]} och lägre`
      const end = starts[t + 1] - 1
      return end === start ? RANKS[start] : `${RANKS[start]}–${RANKS[end]}`
    })]
  }),
) as Record<GroupCount, string[]>

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
  const separate = opts.separateGoalkeepers
  const keepers = separate ? players.filter((p) => p.goalkeeper) : []
  const field = separate ? players.filter((p) => !p.goalkeeper) : players
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

  // Gruppens nivå: nivåns bästa rank (Efter rank) eller bästa spelarens rank (lika stora)
  const byIdRank = new Map(field.map((p) => [p.player_id, p.rank]))
  const groupRank = (ids: number[], i: number) => {
    if (opts.method === 'rank') return RANKS[TIER_STARTS[n][i]]
    if (opts.method === 'rank-equal') {
      const best = ids.map((id) => byIdRank.get(id) ?? null).sort((a, b) => rankIndex(a) - rankIndex(b))[0]
      return best ? best.toUpperCase() : null
    }
    return null
  }
  const result: GroupResult = buckets.map((ids, i) => ({ name: `Grupp ${i + 1}`, grouprank: groupRank(ids, i), playerIds: ids }))
  if (keepers.length) {
    result.push({ name: GOALKEEPER_GROUP, grouprank: null, playerIds: keepers.map((p) => p.player_id), goalkeepers: true })
  }
  return result
}
