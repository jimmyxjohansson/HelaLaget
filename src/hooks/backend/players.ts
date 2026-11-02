// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import { uploadImage } from '../../lib/storage'
import type addPlayersToSquad from '../../server/functions/players/addPlayersToSquad'
import type createPlayer from '../../server/functions/players/createPlayer'
import type getOrganizationPlayers from '../../server/functions/players/getOrganizationPlayers'
import type getPlayer from '../../server/functions/players/getPlayer'
import type getPlayerStats from '../../server/functions/players/getPlayerStats'
import type getPlayers from '../../server/functions/players/getPlayers'
import type getSquadGenders from '../../server/functions/players/getSquadGenders'
import type getSquadStatuses from '../../server/functions/players/getSquadStatuses'
import type getUpcomingBirthdays from '../../server/functions/players/getUpcomingBirthdays'
import type removePlayerFromSquad from '../../server/functions/players/removePlayerFromSquad'
import type updatePlayer from '../../server/functions/players/updatePlayer'

type UploadParams = { data: string; fileName: string; mimeType?: string }

export const useAddPlayersToSquad = createBackendHook<
  Parameters<typeof addPlayersToSquad>[0]['params'],
  Awaited<ReturnType<typeof addPlayersToSquad>>
>('players/addPlayersToSquad')

export const useCreatePlayer = createBackendHook<
  Parameters<typeof createPlayer>[0]['params'],
  Awaited<ReturnType<typeof createPlayer>>
>('players/createPlayer')

export const useGetOrganizationPlayers = createBackendHook<
  Parameters<typeof getOrganizationPlayers>[0]['params'],
  Awaited<ReturnType<typeof getOrganizationPlayers>>
>('players/getOrganizationPlayers')

export const useGetPlayer = createBackendHook<
  Parameters<typeof getPlayer>[0]['params'],
  Awaited<ReturnType<typeof getPlayer>>
>('players/getPlayer')

export const useGetPlayerStats = createBackendHook<
  Parameters<typeof getPlayerStats>[0]['params'],
  Awaited<ReturnType<typeof getPlayerStats>>
>('players/getPlayerStats')

export const useGetPlayers = createBackendHook<
  Parameters<typeof getPlayers>[0]['params'],
  Awaited<ReturnType<typeof getPlayers>>
>('players/getPlayers')

export const useGetSquadGenders = createBackendHook<
  Parameters<typeof getSquadGenders>[0]['params'],
  Awaited<ReturnType<typeof getSquadGenders>>
>('players/getSquadGenders')

export const useGetSquadStatuses = createBackendHook<
  Parameters<typeof getSquadStatuses>[0]['params'],
  Awaited<ReturnType<typeof getSquadStatuses>>
>('players/getSquadStatuses')

export const useGetUpcomingBirthdays = createBackendHook<
  Parameters<typeof getUpcomingBirthdays>[0]['params'],
  Awaited<ReturnType<typeof getUpcomingBirthdays>>
>('players/getUpcomingBirthdays')

export const useRemovePlayerFromSquad = createBackendHook<
  Parameters<typeof removePlayerFromSquad>[0]['params'],
  Awaited<ReturnType<typeof removePlayerFromSquad>>
>('players/removePlayerFromSquad')

export const useUpdatePlayer = createBackendHook<
  Parameters<typeof updatePlayer>[0]['params'],
  Awaited<ReturnType<typeof updatePlayer>>
>('players/updatePlayer')

export const useUploadPlayerImage = createBackendHook<UploadParams, { url: string }>('players/uploadPlayerImage', (p) => uploadImage(p, 'players'))
