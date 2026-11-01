import { GENDER_SHORT, GENDER_STYLE } from '../utils/gender'

/** Liten P/F-markering vid namnet, när laget har både pojkar och flickor. */
export default function GenderBadge({ gender }: { gender: string | null | undefined }) {
  if (!gender || !GENDER_STYLE[gender]) return null
  const s = GENDER_STYLE[gender]
  return (
    <span className="shrink-0 rounded px-1 text-[10px] font-bold" style={{ backgroundColor: s.bg, color: s.fg }} title={gender}>
      {GENDER_SHORT[gender]}
    </span>
  )
}
