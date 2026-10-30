// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type getPushStatus from '../../server/functions/notifications/getPushStatus'
import type sendTestPush from '../../server/functions/notifications/sendTestPush'
import type setPushSquad from '../../server/functions/notifications/setPushSquad'
import type subscribePush from '../../server/functions/notifications/subscribePush'
import type unsubscribePush from '../../server/functions/notifications/unsubscribePush'

export const useGetPushStatus = createBackendHook<
  Parameters<typeof getPushStatus>[0]['params'],
  Awaited<ReturnType<typeof getPushStatus>>
>('notifications/getPushStatus')

export const useSendTestPush = createBackendHook<
  Parameters<typeof sendTestPush>[0]['params'],
  Awaited<ReturnType<typeof sendTestPush>>
>('notifications/sendTestPush')

export const useSetPushSquad = createBackendHook<
  Parameters<typeof setPushSquad>[0]['params'],
  Awaited<ReturnType<typeof setPushSquad>>
>('notifications/setPushSquad')

export const useSubscribePush = createBackendHook<
  Parameters<typeof subscribePush>[0]['params'],
  Awaited<ReturnType<typeof subscribePush>>
>('notifications/subscribePush')

export const useUnsubscribePush = createBackendHook<
  Parameters<typeof unsubscribePush>[0]['params'],
  Awaited<ReturnType<typeof unsubscribePush>>
>('notifications/unsubscribePush')
