/** Gemensamt för övningsbanken och träningsplanen. */

export const GAME_FORMATS = [
  { value: '3v3', label: '3 mot 3' },
  { value: '5v5', label: '5 mot 5' },
  { value: '7v7', label: '7 mot 7' },
  { value: '9v9', label: '9 mot 9' },
  { value: '11v11', label: '11 mot 11' },
] as const

export const formatLabel = (v: string) => GAME_FORMATS.find((f) => f.value === v)?.label ?? v

/** Föreslagna kategorier. Egna kategorier går också att skriva in. */
export const CATEGORIES: { name: string; color: string }[] = [
  { name: 'Uppvärmning', color: '#f59e0b' },
  { name: 'Teknik', color: '#8b5cf6' },
  { name: 'Passningsspel', color: '#0ea5e9' },
  { name: 'Uppbyggnad', color: '#14b8a6' },
  { name: 'Anfallsspel', color: '#ef4444' },
  { name: 'Avslut', color: '#dc2626' },
  { name: 'Försvarsspel', color: '#2563eb' },
  { name: 'Presspel', color: '#1d4ed8' },
  { name: 'Zonspel', color: '#4f46e5' },
  { name: 'Omställning', color: '#db2777' },
  { name: 'Smålagsspel', color: '#16a34a' },
  { name: 'Spel', color: '#15803d' },
  { name: 'Fasta situationer', color: '#a16207' },
  { name: 'Målvakt', color: '#059669' },
  { name: 'Fys', color: '#64748b' },
]

export function categoryColor(name: string) {
  return CATEGORIES.find((c) => c.name === name)?.color ?? '#6b7280'
}

export const INTENSITIES = ['Låg', 'Medel', 'Hög'] as const
export const INTENSITY_COLOR: Record<string, string> = { Låg: '#22c55e', Medel: '#f59e0b', Hög: '#ef4444' }

export const LEVEL_COLOR: Record<string, string> = { Lätt: '#22c55e', Medel: '#f59e0b', Svår: '#ef4444' }

/** Förslag på block i en träningsplan. */
export const BLOCK_NAMES = ['Uppvärmning', 'Teknik', 'Huvuddel', 'Spel', 'Avslutning', 'Målvakt', 'Vattenpaus']

export function playersText(min: number | null | undefined, max: number | null | undefined) {
  if (min && max) return min === max ? `${min} spelare` : `${min}–${max} spelare`
  if (min) return `minst ${min} spelare`
  if (max) return `högst ${max} spelare`
  return null
}
