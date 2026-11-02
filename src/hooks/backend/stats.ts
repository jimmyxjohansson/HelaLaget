// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type getStatsEvents from '../../server/functions/stats/getStatsEvents'
import type getStatsMatches from '../../server/functions/stats/getStatsMatches'
import type getStatsOpponents from '../../server/functions/stats/getStatsOpponents'
import type getStatsTrainings from '../../server/functions/stats/getStatsTrainings'

export const useGetStatsEvents = createBackendHook<
  Parameters<typeof getStatsEvents>[0]['params'],
  Awaited<ReturnType<typeof getStatsEvents>>
>('stats/getStatsEvents')

export const useGetStatsMatches = createBackendHook<
  Parameters<typeof getStatsMatches>[0]['params'],
  Awaited<ReturnType<typeof getStatsMatches>>
>('stats/getStatsMatches')

export const useGetStatsOpponents = createBackendHook<
  Parameters<typeof getStatsOpponents>[0]['params'],
  Awaited<ReturnType<typeof getStatsOpponents>>
>('stats/getStatsOpponents')

export const useGetStatsTrainings = createBackendHook<
  Parameters<typeof getStatsTrainings>[0]['params'],
  Awaited<ReturnType<typeof getStatsTrainings>>
>('stats/getStatsTrainings')
