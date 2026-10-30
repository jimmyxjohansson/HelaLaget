// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type createLeader from '../../server/functions/leaders/createLeader'
import type getLeaders from '../../server/functions/leaders/getLeaders'
import type updateLeader from '../../server/functions/leaders/updateLeader'

export const useCreateLeader = createBackendHook<
  Parameters<typeof createLeader>[0]['params'],
  Awaited<ReturnType<typeof createLeader>>
>('leaders/createLeader')

export const useGetLeaders = createBackendHook<
  Parameters<typeof getLeaders>[0]['params'],
  Awaited<ReturnType<typeof getLeaders>>
>('leaders/getLeaders')

export const useUpdateLeader = createBackendHook<
  Parameters<typeof updateLeader>[0]['params'],
  Awaited<ReturnType<typeof updateLeader>>
>('leaders/updateLeader')
