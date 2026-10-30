// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type getMe from '../../server/functions/account/getMe'
import type requestJoin from '../../server/functions/account/requestJoin'

export const useGetMe = createBackendHook<
  Parameters<typeof getMe>[0]['params'],
  Awaited<ReturnType<typeof getMe>>
>('account/getMe')

export const useRequestJoin = createBackendHook<
  Parameters<typeof requestJoin>[0]['params'],
  Awaited<ReturnType<typeof requestJoin>>
>('account/requestJoin')
