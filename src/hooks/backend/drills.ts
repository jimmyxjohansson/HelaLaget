// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type getDrills from '../../server/functions/drills/getDrills'

export const useGetDrills = createBackendHook<
  Parameters<typeof getDrills>[0]['params'],
  Awaited<ReturnType<typeof getDrills>>
>('drills/getDrills')
