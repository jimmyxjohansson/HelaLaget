/** Cookie som håller senast valt lag. Används av nya flikar och som reserv av servern. */
export const SQUAD_COOKIE = 'hl_squad'

/** Header med flikens lag. Har den ett värde går den före cookien. */
export const SQUAD_HEADER = 'x-squad-id'

/** Flikens eget lag, så att olika flikar kan visa olika lag samtidigt. */
const TAB_KEY = 'hl_tab_squad'

/** Parameter i adressen som anger laget, t.ex. /matches?lag=2. */
export const SQUAD_PARAM = 'lag'

function writeCookie(squadId: number) {
  document.cookie = `${SQUAD_COOKIE}=${squadId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

/** Väljer lag i den här fliken, och som standard för nya flikar. */
export function setSquadCookie(squadId: number) {
  writeCookie(squadId)
  setTabSquad(squadId)
}

export function readSquadCookie(): number | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SQUAD_COOKIE}=(\\d+)`))
  return match ? Number(match[1]) : null
}

export function getTabSquad(): number | null {
  try {
    return Number(sessionStorage.getItem(TAB_KEY)) || null
  } catch {
    return null
  }
}

export function setTabSquad(squadId: number) {
  try {
    sessionStorage.setItem(TAB_KEY, String(squadId))
  } catch {
    // Utan sessionStorage gäller cookien för alla flikar, som tidigare.
  }
}

type SquadNames = { squadId: number; organizationName: string; squadName: string }

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Lagets namn i adressen, t.ex. "skabersjo-if-p-13". Har två av användarens
 * lag samma namn får de lagets nummer på slutet.
 */
export function squadSlug(squad: SquadNames, all: SquadNames[] = []) {
  const slug = slugify(`${squad.organizationName} ${squad.squadName}`) || String(squad.squadId)
  const twins = all.filter((s) => s.squadId !== squad.squadId && slugify(`${s.organizationName} ${s.squadName}`) === slug)
  return twins.length ? `${slug}-${squad.squadId}` : slug
}

/** Adressens ?lag= som det står: ett lagnamn eller (äldre länkar) ett nummer. */
export function squadParamFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(SQUAD_PARAM) || null
  } catch {
    return null
  }
}
