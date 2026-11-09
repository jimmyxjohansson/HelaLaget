// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type addLeadersToSquad from '../../server/functions/leaders/addLeadersToSquad'
import type createLeader from '../../server/functions/leaders/createLeader'
import type getLeaderStats from '../../server/functions/leaders/getLeaderStats'
import type getLeaders from '../../server/functions/leaders/getLeaders'
import type getOrganizationLeaders from '../../server/functions/leaders/getOrganizationLeaders'
import type removeLeaderFromSquad from '../../server/functions/leaders/removeLeaderFromSquad'
import type updateLeader from '../../server/functions/leaders/updateLeader'

export const useAddLeadersToSquad = createBackendHook<
  Parameters<typeof addLeadersToSquad>[0]['params'],
  Awaited<ReturnType<typeof addLeadersToSquad>>
>('leaders/addLeadersToSquad')

export const useCreateLeader = createBackendHook<
  Parameters<typeof createLeader>[0]['params'],
  Awaited<ReturnType<typeof createLeader>>
>('leaders/createLeader')

export const useGetLeaderStats = createBackendHook<
  Parameters<typeof getLeaderStats>[0]['params'],
  Awaited<ReturnType<typeof getLeaderStats>>
>('leaders/getLeaderStats')

export const useGetLeaders = createBackendHook<
  Parameters<typeof getLeaders>[0]['params'],
  Awaited<ReturnType<typeof getLeaders>>
>('leaders/getLeaders')

export const useGetOrganizationLeaders = createBackendHook<
  Parameters<typeof getOrganizationLeaders>[0]['params'],
  Awaited<ReturnType<typeof getOrganizationLeaders>>
>('leaders/getOrganizationLeaders')

export const useRemoveLeaderFromSquad = createBackendHook<
  Parameters<typeof removeLeaderFromSquad>[0]['params'],
  Awaited<ReturnType<typeof removeLeaderFromSquad>>
>('leaders/removeLeaderFromSquad')

export const useUpdateLeader = createBackendHook<
  Parameters<typeof updateLeader>[0]['params'],
  Awaited<ReturnType<typeof updateLeader>>
>('leaders/updateLeader')
