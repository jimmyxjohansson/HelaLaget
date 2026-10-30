// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type createLeague from '../../server/functions/leagues/createLeague'
import type deleteLeague from '../../server/functions/leagues/deleteLeague'
import type deleteStanding from '../../server/functions/leagues/deleteStanding'
import type getLeagueMatches from '../../server/functions/leagues/getLeagueMatches'
import type getLeagues from '../../server/functions/leagues/getLeagues'
import type updateLeague from '../../server/functions/leagues/updateLeague'
import type upsertStanding from '../../server/functions/leagues/upsertStanding'

export const useCreateLeague = createBackendHook<
  Parameters<typeof createLeague>[0]['params'],
  Awaited<ReturnType<typeof createLeague>>
>('leagues/createLeague')

export const useDeleteLeague = createBackendHook<
  Parameters<typeof deleteLeague>[0]['params'],
  Awaited<ReturnType<typeof deleteLeague>>
>('leagues/deleteLeague')

export const useDeleteStanding = createBackendHook<
  Parameters<typeof deleteStanding>[0]['params'],
  Awaited<ReturnType<typeof deleteStanding>>
>('leagues/deleteStanding')

export const useGetLeagueMatches = createBackendHook<
  Parameters<typeof getLeagueMatches>[0]['params'],
  Awaited<ReturnType<typeof getLeagueMatches>>
>('leagues/getLeagueMatches')

export const useGetLeagues = createBackendHook<
  Parameters<typeof getLeagues>[0]['params'],
  Awaited<ReturnType<typeof getLeagues>>
>('leagues/getLeagues')

export const useUpdateLeague = createBackendHook<
  Parameters<typeof updateLeague>[0]['params'],
  Awaited<ReturnType<typeof updateLeague>>
>('leagues/updateLeague')

export const useUpsertStanding = createBackendHook<
  Parameters<typeof upsertStanding>[0]['params'],
  Awaited<ReturnType<typeof upsertStanding>>
>('leagues/upsertStanding')
