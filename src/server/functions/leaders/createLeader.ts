import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = { firstname: string; lastname?: string | null; shortname?: string | null }

export default async function createLeader(req: { params: Params; user: User }) {
  const firstname = req.params.firstname?.trim()
  if (!firstname) throw new Error('Ange förnamn.')
  const lastname = req.params.lastname?.trim() || null
  const shortname = req.params.shortname?.trim() || `${firstname}${lastname ? ' ' + lastname[0] : ''}`
  const { data } = await db.query<{ id: number }>(
    'INSERT INTO leaders (firstname, lastname, shortname, active) VALUES ($1, $2, $3, true) RETURNING id',
    [firstname, lastname, shortname],
  )
  await db.query('INSERT INTO squad_leaders (squad_id, leader_id) VALUES (app.squad_id(), $1)', [data[0].id])
  return { id: data[0].id }
}
