import { db } from '@/server/db'
import { mergeFormats } from '@/utils/gameFormats'
import type { User } from '@/server/types'

export default async function getTeamsAndLeagues(_req: { params: Record<string, never>; user: User }) {
  const [teams, leagues, cups, squad, formats] = await Promise.all([
    db.query<{ id: number; team: string; imgurl: string | null; country: string | null }>(`SELECT id, team, imgurl, country FROM teams ORDER BY team`),
    db.query<{ id: number; name: string }>(`SELECT id, name FROM leagues WHERE status = 'Aktiv' ORDER BY name`),
    db.query<{ id: number; name: string; startdate: string | null; enddate: string | null; indooroutdoor: string | null; periods: number | null; playtime: number | null; matchplayers: string | null; difficulty: string | null }>(`SELECT id, name, startdate, enddate, indooroutdoor, periods, playtime, matchplayers, difficulty FROM cups ORDER BY startdate DESC NULLS LAST, name`),
    db.query<{ game_format: string | null }>(`SELECT game_format FROM squads WHERE id = app.squad_id()`),
    db.query<{ format: string; playtime: number | null; periods: number | null }>(
      `SELECT format, playtime, periods FROM org_game_formats WHERE organization_id = app.org_id()`),
  ])

  return {
    teams: teams.data,
    leagues: leagues.data,
    cups: cups.data,
    /** Lagets spelform och föreningens speltid och perioder per spelform */
    gameFormat: squad.data[0]?.game_format ?? null,
    formats: mergeFormats(formats.data),
  }
}
