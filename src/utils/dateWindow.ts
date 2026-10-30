// Tider sparas som väggklocka med Z (17:30 svensk tid = 17:30Z). Intervallen
// räknas därför från dagens datum i lokal tid, uttryckt som midnatt UTC.
export function wallDayIso(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00Z`
}
