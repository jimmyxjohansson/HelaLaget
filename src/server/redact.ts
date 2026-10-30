// Fält som läsrollen (t.ex. föräldrar) inte ska se. Tas bort ur alla svar,
// på alla nivåer, innan de skickas till en användare med rollen 'viewer'.
const HIDDEN_FOR_VIEWERS = new Set([
  'birthdate',
  'reason',
  'reasontime',
  'notes',
  'comment',
  'rank',
  'grouprank',
  'group1rank',
  'group2rank',
  'group3rank',
  'group4rank',
  'group5rank',
  'backbone',
  'memberid',
])

export function redactForViewer(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForViewer)
  if (value instanceof Date || value === null || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (!HIDDEN_FOR_VIEWERS.has(k)) out[k] = redactForViewer(v)
  }
  return out
}
