import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  firstname: string
  lastname?: string | null
  shortname?: string | null
  number?: number | null
  birthdate?: string | null
  gender?: string | null
}

/** Ny spelare i föreningen, kopplad till valt lag. */
export default async function createPlayer(req: { params: Params; user: User }) {
  const p = req.params
  const firstname = p.firstname?.trim()
  if (!firstname) throw new Error('Ange förnamn.')
  const lastname = p.lastname?.trim() || null
  const shortname = p.shortname?.trim() || `${firstname}${lastname ? ' ' + lastname[0] : ''}`

  const { data } = await db.query<{ id: number }>(
    `INSERT INTO players (firstname, lastname, shortname, number, birthdate, status, active, gender)
     VALUES ($1, $2, $3, $4, $5::date, 'Aktiv', true, $6)
     RETURNING id`,
    [firstname, lastname, shortname, p.number ?? 0, p.birthdate || null, p.gender === 'Pojke' || p.gender === 'Flicka' ? p.gender : null],
  )
  await db.query('INSERT INTO squad_players (squad_id, player_id) VALUES (app.squad_id(), $1)', [data[0].id])
  return { id: data[0].id }
}
