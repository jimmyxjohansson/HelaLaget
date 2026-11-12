/** Färger på spelarna i Taktiktavlan. Laget väljer dem under Laginställningar. */
export type KitColors = { shirt: string; shorts: string }
export type TacticsKit = { us: KitColors; usGK: KitColors; opp: KitColors; oppGK: KitColors }

export const KIT_PARTS: { key: keyof TacticsKit; label: string }[] = [
  { key: 'us', label: 'Vårt lag' },
  { key: 'usGK', label: 'Vår målvakt' },
  { key: 'opp', label: 'Motståndarna' },
  { key: 'oppGK', label: 'Motståndarnas målvakt' },
]

const HEX = /^#[0-9a-fA-F]{6}$/

/** Standard: vårt lag i lagets färger (tröja i textfärgen, byxor i huvudfärgen), övriga som förut. */
export function defaultKit(primary?: string | null, accent?: string | null): TacticsKit {
  return {
    us: { shirt: accent && HEX.test(accent) ? accent : '#ffd21f', shorts: primary && HEX.test(primary) ? primary : '#1e7a3c' },
    usGK: { shirt: '#7c3aed', shorts: '#6d28d9' },
    opp: { shirt: '#1d4ed8', shorts: '#ffffff' },
    oppGK: { shirt: '#f97316', shorts: '#ffffff' },
  }
}

/** Sparade färger ovanpå standarden; ogiltiga värden ignoreras. */
export function resolveKit(saved: unknown, primary?: string | null, accent?: string | null): TacticsKit {
  const kit = defaultKit(primary, accent)
  const s = (saved && typeof saved === 'object' ? saved : {}) as Record<string, Partial<KitColors>>
  for (const { key } of KIT_PARTS) {
    const v = s[key]
    if (v?.shirt && HEX.test(v.shirt)) kit[key].shirt = v.shirt
    if (v?.shorts && HEX.test(v.shorts)) kit[key].shorts = v.shorts
  }
  return kit
}

/** Rensar en sparad uppsättning till giltiga färger (null om inget är satt). */
export function cleanKit(v: unknown): Partial<TacticsKit> | null {
  if (!v || typeof v !== 'object') return null
  const out: Partial<TacticsKit> = {}
  for (const { key } of KIT_PARTS) {
    const p = (v as Record<string, Partial<KitColors>>)[key]
    if (p && HEX.test(p.shirt ?? '') && HEX.test(p.shorts ?? '')) out[key] = { shirt: p.shirt!, shorts: p.shorts! }
  }
  return Object.keys(out).length ? out : null
}

/** Vit eller mörk text, det som syns bäst mot färgen (tröjnumret). */
export function contrastText(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1a1a1a' : '#ffffff'
}
