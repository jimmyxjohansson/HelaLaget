import 'server-only'
import { AccessError } from '../access'
import { ATTENDED_STATUSES, betweenDates } from '../attendance'

/** Planeringen hanterar kallelser till både matcher och cuper på samma sätt. */
export type Kind = 'match' | 'cup'

export const KIND = {
  match: { participants: 'participantsmatches', fk: 'match', events: 'matches', statusType: 'status_enum_499f7eb6' },
  cup: { participants: 'participantscups', fk: 'cup', events: 'cups', statusType: 'status_enum_87ddba0d' },
} as const

export function kindOf(value: unknown): Kind {
  if (value === 'match' || value === 'cup') return value
  throw new AccessError('Okänd typ (match eller cup).', 400)
}

/** Svar på en kallelse. */
export const PARTICIPANT_STATUSES = ['Förslag', 'Inbjuden', 'Kommer', 'Nekat', 'Ej svarat', 'Reserv'] as const

export function participantStatus(value: unknown): string {
  if (typeof value === 'string' && (PARTICIPANT_STATUSES as readonly string[]).includes(value)) return value
  throw new AccessError('Okänd svarsstatus.', 400)
}

/** Status på själva matchen eller cupen. */
export const EVENT_STATUSES: Record<Kind, readonly string[]> = {
  match: ['Ny', 'Förslag', 'Kallad', 'Registrerad i Fogis', 'Avslutad', '-'],
  cup: ['Ny', 'Förslag', 'Kallad', 'Avslutad', '-'],
}

export function ids(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(Number).filter((n) => Number.isInteger(n) && n > 0)
}

/** "ÅÅÅÅ-MM-DD" eller null (= ingen nedre gräns). */
export function fromDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

/**
 * Träningsnärvaro per spelare: genomförda träningar (typ Träning) från $FROM
 * till och med i dag. Tider sparas som väggklocka i UTC (17:30Z = 17:30).
 * Använd som LEFT JOIN LATERAL (...) a ON true, med spelarens id som p.id.
 */
export function attendanceLateral(fromParam: string) {
  return `LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE pt.status::text IN ${ATTENDED_STATUSES})::int AS coming,
        COUNT(*)::int AS total
      FROM participantstrainings pt
      JOIN trainings t ON t.id = pt.training
      WHERE pt.player = p.id
        AND t.type::text = 'Träning'
        AND ${betweenDates(fromParam, 'NULL')}
    ) a ON true`
}
