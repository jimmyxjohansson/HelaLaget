/** Träningsgrupperna: Grupp 1–8 och en egen grupp för målvakter. Namnet sparas på deltagaren. */
export const TRAINING_GROUPS = [
  'Grupp 1', 'Grupp 2', 'Grupp 3', 'Grupp 4', 'Grupp 5', 'Grupp 6', 'Grupp 7', 'Grupp 8', 'Målvakter',
] as const

export type TrainingGroup = (typeof TRAINING_GROUPS)[number]

export const GOALKEEPER_GROUP: TrainingGroup = 'Målvakter'

/** Kort namn på knappar: "1" … "8", "MV". */
export function groupShort(group: string) {
  return group === GOALKEEPER_GROUP ? 'MV' : group.replace('Grupp ', '')
}

/** Namn på flikar: "G1" … "G8", "MV". */
export function groupTab(group: string) {
  return group === GOALKEEPER_GROUP ? 'MV' : group.replace('Grupp ', 'G')
}

/** Nivå som gruppen får när en spelare flyttas dit för hand. */
export const GROUP_DEFAULT_RANK: Record<string, string | null> = {
  'Grupp 1': 'A', 'Grupp 2': 'B', 'Grupp 3': 'C', 'Grupp 4': 'X', 'Grupp 5': 'X',
  'Grupp 6': 'X', 'Grupp 7': 'X', 'Grupp 8': 'X', 'Målvakter': null,
}
