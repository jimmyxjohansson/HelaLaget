// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type acknowledgeRemovedEvent from '../../server/functions/svenskalag/acknowledgeRemovedEvent'
import type decideSvenskalagEvent from '../../server/functions/svenskalag/decideSvenskalagEvent'
import type getSvenskalagStatus from '../../server/functions/svenskalag/getSvenskalagStatus'
import type syncSvenskalag from '../../server/functions/svenskalag/syncSvenskalag'

export const useAcknowledgeRemovedEvent = createBackendHook<
  Parameters<typeof acknowledgeRemovedEvent>[0]['params'],
  Awaited<ReturnType<typeof acknowledgeRemovedEvent>>
>('svenskalag/acknowledgeRemovedEvent')

export const useDecideSvenskalagEvent = createBackendHook<
  Parameters<typeof decideSvenskalagEvent>[0]['params'],
  Awaited<ReturnType<typeof decideSvenskalagEvent>>
>('svenskalag/decideSvenskalagEvent')

export const useGetSvenskalagStatus = createBackendHook<
  Parameters<typeof getSvenskalagStatus>[0]['params'],
  Awaited<ReturnType<typeof getSvenskalagStatus>>
>('svenskalag/getSvenskalagStatus')

export const useSyncSvenskalag = createBackendHook<
  Parameters<typeof syncSvenskalag>[0]['params'],
  Awaited<ReturnType<typeof syncSvenskalag>>
>('svenskalag/syncSvenskalag')
