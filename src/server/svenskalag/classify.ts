// Tolkar Svenskalag-händelser till träningar, matcher eller övrigt (för granskning).
import type { IcalEvent } from './ical'

export type TrainingType = 'Träning' | 'Coerver' | 'Extra' | 'Målvaktsträning'

export type Classified =
  | { kind: 'club'; reason: string }
  | { kind: 'training'; type: TrainingType; indoor: boolean }
  | {
      kind: 'match'
      homeaway: 'Hemma' | 'Borta'
      opponent: string
      ourTeam: string
      league: string | null
      matchtype: 'Serie' | 'Träning' | 'Cup'
      indoor: boolean
    }
  | { kind: 'other' }

/** Svenskalags aktivitets-id ur UID ('cal21391816-64728@svenskalag.se' → 21391816). */
export function externalIdFromUid(uid: string): number | null {
  const m = /^cal(\d+)-/i.exec(uid)
  return m ? Number(m[1]) : null
}

/** Aktivitets-id ur en sparad Svenskalag-länk (…/aktivitet/123/… eller …/match/123/…). */
export function externalIdFromUrl(url: string | null | undefined): number | null {
  const m = /\/(?:aktivitet|match)\/(\d+)/i.exec(url ?? '')
  return m ? Number(m[1]) : null
}

/** Rubriken utan suffixet ' // P-13 - Skabersjö IF'. Returnerar även suffixet. */
export function splitSummary(summary: string): { title: string; owner: string } {
  const i = summary.lastIndexOf(' // ')
  return i < 0 ? { title: summary.trim(), owner: '' } : { title: summary.slice(0, i).trim(), owner: summary.slice(i + 4).trim() }
}

/** Lagets adress hos Svenskalag ur beskrivningen ('www.svenskalag.se/skabersjoif-p-13'). */
export function teamPathFromDescription(description: string): string | null {
  const m = /svenskalag\.se\/([a-z0-9-]+)/i.exec(description)
  return m ? m[1].toLowerCase() : null
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Länk till händelsen hos Svenskalag, i samma form som befintliga länkar i databasen. */
export function svenskalagUrl(teamPath: string, kind: 'match' | 'activity', id: number, slugSource: string) {
  const slug = slugify(slugSource)
  return `https://www.svenskalag.se/${teamPath}/${kind === 'match' ? 'match' : 'aktivitet'}/${id}${slug ? `/${slug}` : ''}`
}

/** Text utan Svenskalags sidfot ("… hämtad och synkas från Svenskalag.se"). */
export function cleanDescription(description: string): string {
  return description
    .replace(/\n*(Aktiviteten|Matchen) hämtad och synkas från Svenskalag\.se\.[\s\S]*$/i, '')
    .trim()
}

const norm = (s: string) => s.toLowerCase().replace(/[:\s]+/g, ' ').trim()
const looksIndoor = (title: string, location: string) =>
  /inomhus|futsal/i.test(title) || /hall(en)?\b|idrottshall|sporthall/i.test(location)

/**
 * Klassa en händelse.
 * @param calendarName lagkalenderns namn, t.ex. 'P-13 - Skabersjö IF'
 * @param clubName föreningens namn i Hela Laget, t.ex. 'Skabersjö IF'
 */
export function classify(event: IcalEvent, calendarName: string, clubName: string): Classified {
  const { title, owner } = splitSummary(event.summary)

  // Föreningens gemensamma aktiviteter (årsmöte, julmarknad …) har föreningen, inte laget, som ägare.
  if (owner && calendarName && norm(owner) !== norm(calendarName)) {
    return { kind: 'club', reason: owner }
  }

  // Match: Skabersjö IF - Tomelilla IF blå (P13 (f.2013) Sydvästra B5, vinter)
  const match = /^match:\s*(.+?)\s+-\s+(.+?)(?:\s*\((.*)\))?\s*$/i.exec(title)
  if (match) {
    const [, home, away, league] = match
    const club = norm(clubName)
    const homeIsUs = norm(home).startsWith(club)
    const awayIsUs = norm(away).startsWith(club)
    if (homeIsUs !== awayIsUs) {
      const leagueText = league?.trim() || null
      return {
        kind: 'match',
        homeaway: homeIsUs ? 'Hemma' : 'Borta',
        opponent: (homeIsUs ? away : home).trim(),
        ourTeam: (homeIsUs ? home : away).trim(),
        league: leagueText,
        matchtype: /tr[äa]ningsmatch/i.test(leagueText ?? '') ? 'Träning' : /cup/i.test(leagueText ?? '') ? 'Cup' : 'Serie',
        indoor: looksIndoor(title + ' ' + (leagueText ?? ''), event.location),
      }
    }
    return { kind: 'other' }
  }

  // Träningar
  const t = title.toLowerCase()
  if (/^(inomhus)?träning\b/.test(t) || /^utomhusträning\b/.test(t)) {
    return { kind: 'training', type: 'Träning', indoor: looksIndoor(title, event.location) }
  }
  if (/^coerver\b/.test(t)) return { kind: 'training', type: 'Coerver', indoor: looksIndoor(title, event.location) }
  if (/^målvakts?träning\b/.test(t)) {
    return { kind: 'training', type: 'Målvaktsträning', indoor: looksIndoor(title, event.location) }
  }
  if (/^(extraträning|jj fitness)\b/.test(t)) {
    return { kind: 'training', type: 'Extra', indoor: true }
  }

  return { kind: 'other' }
}
