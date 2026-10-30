/** Background color for each player rank badge */
export const RANK_COLOR: Record<string, string> = {
  A:  '#34A853',
  AB: '#34A853',
  B:  '#4285F4',
  BC: '#4285F4',
  C:  '#FBBC04',
  CD: '#FBBC04',
  D:  '#FFA500',
  X:  '#B7B7B7',
}

/** Returns inline style for a rank badge (bg color + white text) */
export function rankStyle(rank: string | null | undefined): React.CSSProperties {
  if (!rank) return {}
  return { backgroundColor: RANK_COLOR[rank] ?? '#B7B7B7', color: '#fff' }
}
