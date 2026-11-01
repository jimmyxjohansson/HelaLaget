// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type deleteDrill from '../../server/functions/drills/deleteDrill'
import type getDrill from '../../server/functions/drills/getDrill'
import type getDrills from '../../server/functions/drills/getDrills'
import type importStarterDrills from '../../server/functions/drills/importStarterDrills'
import type saveDrill from '../../server/functions/drills/saveDrill'

export const useDeleteDrill = createBackendHook<
  Parameters<typeof deleteDrill>[0]['params'],
  Awaited<ReturnType<typeof deleteDrill>>
>('drills/deleteDrill')

export const useGetDrill = createBackendHook<
  Parameters<typeof getDrill>[0]['params'],
  Awaited<ReturnType<typeof getDrill>>
>('drills/getDrill')

export const useGetDrills = createBackendHook<
  Parameters<typeof getDrills>[0]['params'],
  Awaited<ReturnType<typeof getDrills>>
>('drills/getDrills')

export const useImportStarterDrills = createBackendHook<
  Parameters<typeof importStarterDrills>[0]['params'],
  Awaited<ReturnType<typeof importStarterDrills>>
>('drills/importStarterDrills')

export const useSaveDrill = createBackendHook<
  Parameters<typeof saveDrill>[0]['params'],
  Awaited<ReturnType<typeof saveDrill>>
>('drills/saveDrill')
