// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type deleteSquadInfo from '../../server/functions/infos/deleteSquadInfo'
import type getSquadInfos from '../../server/functions/infos/getSquadInfos'
import type moveSquadInfo from '../../server/functions/infos/moveSquadInfo'
import type saveSquadInfo from '../../server/functions/infos/saveSquadInfo'

export const useDeleteSquadInfo = createBackendHook<
  Parameters<typeof deleteSquadInfo>[0]['params'],
  Awaited<ReturnType<typeof deleteSquadInfo>>
>('infos/deleteSquadInfo')

export const useGetSquadInfos = createBackendHook<
  Parameters<typeof getSquadInfos>[0]['params'],
  Awaited<ReturnType<typeof getSquadInfos>>
>('infos/getSquadInfos')

export const useMoveSquadInfo = createBackendHook<
  Parameters<typeof moveSquadInfo>[0]['params'],
  Awaited<ReturnType<typeof moveSquadInfo>>
>('infos/moveSquadInfo')

export const useSaveSquadInfo = createBackendHook<
  Parameters<typeof saveSquadInfo>[0]['params'],
  Awaited<ReturnType<typeof saveSquadInfo>>
>('infos/saveSquadInfo')
