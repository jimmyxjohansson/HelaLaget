import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = {
  id: number
  firstname: string
  lastname: string
  shortname: string
  number: number | null
  birthdate: string | null
  status: string
  rank: string | null
  foot: string | null
  comment: string | null
  img: string | null
  backbone: string | null
  memberid: number | null
  defender: boolean
  defensivemidfielder: boolean
  offensivemidfielder: boolean
  winger: boolean
  striker: boolean
  goalkeeper: boolean
  gender?: string | null
  shirt_size?: string | null
  shorts_size?: string | null
  sock_size?: string | null
}

export default async function updatePlayer(req: { params: Params; user: User }) {
  const p = req.params
  const result = await db.query(
    `UPDATE players SET
      firstname = $1,
      lastname = $2,
      shortname = $3,
      number = $4,
      birthdate = $5,
      status = $6,
      rank = $7,
      foot = $8,
      comment = $9,
      backbone = $10,
      memberid = $11,
      defender = $12,
      defensivemidfielder = $13,
      offensivemidfielder = $14,
      winger = $15,
      striker = $16,
      goalkeeper = $17,
      img = $18,
      gender = $20,
      shirt_size = $21,
      shorts_size = $22,
      sock_size = $23
    WHERE id = $19
    RETURNING id`,
    [
      p.firstname,
      p.lastname,
      p.shortname,
      p.number,
      p.birthdate || null,
      p.status,
      p.rank || null,
      p.foot || null,
      p.comment || null,
      p.backbone || null,
      p.memberid,
      p.defender,
      p.defensivemidfielder,
      p.offensivemidfielder,
      p.winger,
      p.striker,
      p.goalkeeper,
      p.img || null,
      p.id,
      p.gender === 'Pojke' || p.gender === 'Flicka' ? p.gender : null,
      size(p.shirt_size),
      size(p.shorts_size),
      size(p.sock_size),
    ]
  )
  return result.data[0]
}

/** Storlek som fritext, högst 12 tecken. */
function size(v: string | null | undefined) {
  const t = typeof v === 'string' ? v.trim().slice(0, 12) : ''
  return t || null
}
