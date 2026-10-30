const TYPE_COLORS: Record<string, string> = {
  'Träning':          '#008000',
  'Coerver':          '#FFA500',
  'Extra':            '#0000FF',
  'Målvaktsträning':  '#0000FF',
}

export function trainingTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#888888'
}
