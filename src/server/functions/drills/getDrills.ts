import { db } from '@/server/db'
import type { User } from '@/server/types'

type Params = Record<string, never>

export default async function getDrills(_req: { params: Params; user: User }) {
  const result = await db.query<{
    id: number
    name: string
    videourl: string
    minimumplayers: string
    category: unknown
  }>(
    `SELECT id, name, videourl, minimumplayers, category
     FROM trainingdrills
     ORDER BY name`
  )
  return result.data
}
