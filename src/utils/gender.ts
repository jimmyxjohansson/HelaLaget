/** Spelarens kön. Används i planeringen och gruppindelningen när laget har både pojkar och flickor. */
export const GENDERS = ['Pojke', 'Flicka'] as const
export type Gender = (typeof GENDERS)[number]

export const GENDER_SHORT: Record<string, string> = { Pojke: 'P', Flicka: 'F' }
export const GENDER_PLURAL: Record<string, string> = { Pojke: 'Pojkar', Flicka: 'Flickor' }
export const GENDER_STYLE: Record<string, { bg: string; fg: string }> = {
  Pojke: { bg: '#dbeafe', fg: '#1d4ed8' },
  Flicka: { bg: '#fce7f3', fg: '#be185d' },
}

/** Har listan både pojkar och flickor? Annars behövs inga val om kön. */
export function isMixed(list: { gender?: string | null }[]) {
  let boys = false
  let girls = false
  for (const p of list) {
    if (p.gender === 'Pojke') boys = true
    else if (p.gender === 'Flicka') girls = true
    if (boys && girls) return true
  }
  return false
}

/** Filtrera på valda kön. Spelare utan angivet kön visas alltid. */
export function byGender<T extends { gender?: string | null }>(list: T[], genders: string[]) {
  return list.filter((p) => !p.gender || genders.includes(p.gender))
}

/** "7 P · 5 F" för en lista, tom text om ingen har angivet kön. */
export function genderSummary(list: { gender?: string | null }[]) {
  const boys = list.filter((p) => p.gender === 'Pojke').length
  const girls = list.filter((p) => p.gender === 'Flicka').length
  return boys || girls ? `${boys} P · ${girls} F` : ''
}
