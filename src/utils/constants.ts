// Lagets egen logga, som visas i matchvyerna. Sätt NEXT_PUBLIC_OWN_TEAM_LOGO_URL
// när loggan har flyttats från Retool Storage (se docs/MIGRERING.md).
export const OWN_TEAM_LOGO_URL =
  process.env.NEXT_PUBLIC_OWN_TEAM_LOGO_URL ||
  'https://skabersjoifp13.retool.com/api/file/1b186491-0085-4624-810b-a243328c9160'
