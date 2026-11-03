// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type decideMember from '../../server/functions/members/decideMember'
import type getLinkablePlayers from '../../server/functions/members/getLinkablePlayers'
import type getMembers from '../../server/functions/members/getMembers'
import type getSquadSettings from '../../server/functions/members/getSquadSettings'
import type regenerateJoinCode from '../../server/functions/members/regenerateJoinCode'
import type removeMember from '../../server/functions/members/removeMember'
import type updateMember from '../../server/functions/members/updateMember'
import type updateSquadSettings from '../../server/functions/members/updateSquadSettings'

export const useDecideMember = createBackendHook<
  Parameters<typeof decideMember>[0]['params'],
  Awaited<ReturnType<typeof decideMember>>
>('members/decideMember')

export const useGetLinkablePlayers = createBackendHook<
  Parameters<typeof getLinkablePlayers>[0]['params'],
  Awaited<ReturnType<typeof getLinkablePlayers>>
>('members/getLinkablePlayers')

export const useGetMembers = createBackendHook<
  Parameters<typeof getMembers>[0]['params'],
  Awaited<ReturnType<typeof getMembers>>
>('members/getMembers')

export const useGetSquadSettings = createBackendHook<
  Parameters<typeof getSquadSettings>[0]['params'],
  Awaited<ReturnType<typeof getSquadSettings>>
>('members/getSquadSettings')

export const useRegenerateJoinCode = createBackendHook<
  Parameters<typeof regenerateJoinCode>[0]['params'],
  Awaited<ReturnType<typeof regenerateJoinCode>>
>('members/regenerateJoinCode')

export const useRemoveMember = createBackendHook<
  Parameters<typeof removeMember>[0]['params'],
  Awaited<ReturnType<typeof removeMember>>
>('members/removeMember')

export const useUpdateMember = createBackendHook<
  Parameters<typeof updateMember>[0]['params'],
  Awaited<ReturnType<typeof updateMember>>
>('members/updateMember')

export const useUpdateSquadSettings = createBackendHook<
  Parameters<typeof updateSquadSettings>[0]['params'],
  Awaited<ReturnType<typeof updateSquadSettings>>
>('members/updateSquadSettings')
