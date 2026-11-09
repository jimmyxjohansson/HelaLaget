/** Spelformer som matcher och cuper kan ha. */
export const GAME_FORMATS = ['3 v 3', '5 v 5', '7 v 7', '8 v 8', '9 v 9', '11 v 11'] as const

export type FormatDefault = { playtime: number | null; periods: number | null }
export type FormatDefaults = Record<string, FormatDefault>

/** Appens standard per spelform. Föreningen kan ändra dem under Laginställningar. */
export const DEFAULT_FORMATS: FormatDefaults = {
  '3 v 3': { playtime: 3, periods: 4 },
  '5 v 5': { playtime: 15, periods: 3 },
  '7 v 7': { playtime: 20, periods: 3 },
  '8 v 8': { playtime: null, periods: null },
  '9 v 9': { playtime: 25, periods: 3 },
  '11 v 11': { playtime: 35, periods: 2 },
}

/** Appens standard med föreningens ändringar ovanpå. */
export function mergeFormats(rows: { format: string; playtime: number | null; periods: number | null }[]): FormatDefaults {
  const out: FormatDefaults = {}
  for (const f of GAME_FORMATS) out[f] = { ...DEFAULT_FORMATS[f] }
  for (const r of rows) {
    if (!out[r.format]) continue
    out[r.format] = {
      playtime: r.playtime ?? out[r.format].playtime,
      periods: r.periods ?? out[r.format].periods,
    }
  }
  return out
}
