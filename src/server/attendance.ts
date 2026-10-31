import 'server-only'

/**
 * Gemensam definition av träningsnärvaro, så att spelarlistan, spelarsidan,
 * närvarostatistiken och planeringen visar samma siffror:
 *
 * - Bara träningar av typen Träning som har ägt rum (till och med i dag).
 *   Kommande träningar (t.ex. importerade från Svenskalag med spelarna
 *   anmälda) räknas inte.
 * - Närvarande: Närvarande, Närvarande ej hela, Anmäld och Annan aktivitet
 *   (samma som i Retool). Totalt: alla spelarens rader för träningarna.
 *
 * Tider sparas som väggklocka i UTC (17:30Z = 17:30 svensk tid).
 */

export const ATTENDED_STATUSES = `('Närvarande', 'Närvarande, ej hela', 'Anmäld', 'Annan aktivitet')`

/** Svensk "i morgon 00:00" i lagrad väggklocka: allt före det har ägt rum. */
const TOMORROW = `(((now() AT TIME ZONE 'Europe/Stockholm')::date + 1)::timestamp AT TIME ZONE 'UTC')`

/** Villkor på träningen `t`: genomförd träning av typen Träning. */
export const PAST_TRAINING = `t.type::text = 'Träning' AND t.date < ${TOMORROW}`

/** Villkor på `t.date`: senaste N månaderna (0 = alla). Parametern är ett heltal. */
export function withinMonths(param: string) {
  return `(${param}::int = 0 OR t.date >= (((now() AT TIME ZONE 'Europe/Stockholm')::date - make_interval(months => ${param}::int))::timestamp AT TIME ZONE 'UTC'))`
}

/** Villkor på `t.date`: från datum (ÅÅÅÅ-MM-DD, null = alla) till och med datum (null = i dag). */
export function betweenDates(fromParam: string, toParam: string) {
  return `(${fromParam}::date IS NULL OR t.date >= (${fromParam}::date)::timestamp AT TIME ZONE 'UTC')
      AND (${toParam}::date IS NULL OR t.date < ((${toParam}::date + 1)::timestamp AT TIME ZONE 'UTC'))
      AND t.date < ${TOMORROW}`
}

/** Svensk "nu" i lagrad väggklocka. */
export const NOW_WALLCLOCK = `((now() AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'UTC')`

/** Villkor på valfri tidskolumn: senaste N månaderna (0 = alla). */
export function withinMonthsOf(column: string, param: string) {
  return `(${param}::int = 0 OR ${column} >= (((now() AT TIME ZONE 'Europe/Stockholm')::date - make_interval(months => ${param}::int))::timestamp AT TIME ZONE 'UTC'))`
}
