// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import { uploadImage } from '../../lib/storage'
import type getPlayer from '../../server/functions/players/getPlayer'
import type getPlayers from '../../server/functions/players/getPlayers'
import type getUpcomingBirthdays from '../../server/functions/players/getUpcomingBirthdays'
import type updatePlayer from '../../server/functions/players/updatePlayer'

type UploadParams = { data: string; fileName: string; mimeType?: string }

export const useGetPlayer = createBackendHook<
  Parameters<typeof getPlayer>[0]['params'],
  Awaited<ReturnType<typeof getPlayer>>
>('players/getPlayer')

export const useGetPlayers = createBackendHook<
  Parameters<typeof getPlayers>[0]['params'],
  Awaited<ReturnType<typeof getPlayers>>
>('players/getPlayers')

export const useGetUpcomingBirthdays = createBackendHook<
  Parameters<typeof getUpcomingBirthdays>[0]['params'],
  Awaited<ReturnType<typeof getUpcomingBirthdays>>
>('players/getUpcomingBirthdays')

export const useUpdatePlayer = createBackendHook<
  Parameters<typeof updatePlayer>[0]['params'],
  Awaited<ReturnType<typeof updatePlayer>>
>('players/updatePlayer')

export const useUploadPlayerImage = createBackendHook<UploadParams, { url: string }>('players/uploadPlayerImage', (p) => uploadImage(p, 'players'))
