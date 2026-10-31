// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type addPlanningLeaders from '../../server/functions/planning/addPlanningLeaders'
import type addPlanningPlayers from '../../server/functions/planning/addPlanningPlayers'
import type getPlanningAnswers from '../../server/functions/planning/getPlanningAnswers'
import type getPlanningCandidates from '../../server/functions/planning/getPlanningCandidates'
import type getPlanningEvents from '../../server/functions/planning/getPlanningEvents'
import type getPlanningSlot from '../../server/functions/planning/getPlanningSlot'
import type movePlanningParticipants from '../../server/functions/planning/movePlanningParticipants'
import type removePlanningParticipants from '../../server/functions/planning/removePlanningParticipants'
import type setPlanningEventStatus from '../../server/functions/planning/setPlanningEventStatus'
import type setPlanningStatus from '../../server/functions/planning/setPlanningStatus'
import type updatePlanningAnswer from '../../server/functions/planning/updatePlanningAnswer'

export const useAddPlanningLeaders = createBackendHook<
  Parameters<typeof addPlanningLeaders>[0]['params'],
  Awaited<ReturnType<typeof addPlanningLeaders>>
>('planning/addPlanningLeaders')

export const useAddPlanningPlayers = createBackendHook<
  Parameters<typeof addPlanningPlayers>[0]['params'],
  Awaited<ReturnType<typeof addPlanningPlayers>>
>('planning/addPlanningPlayers')

export const useGetPlanningAnswers = createBackendHook<
  Parameters<typeof getPlanningAnswers>[0]['params'],
  Awaited<ReturnType<typeof getPlanningAnswers>>
>('planning/getPlanningAnswers')

export const useGetPlanningCandidates = createBackendHook<
  Parameters<typeof getPlanningCandidates>[0]['params'],
  Awaited<ReturnType<typeof getPlanningCandidates>>
>('planning/getPlanningCandidates')

export const useGetPlanningEvents = createBackendHook<
  Parameters<typeof getPlanningEvents>[0]['params'],
  Awaited<ReturnType<typeof getPlanningEvents>>
>('planning/getPlanningEvents')

export const useGetPlanningSlot = createBackendHook<
  Parameters<typeof getPlanningSlot>[0]['params'],
  Awaited<ReturnType<typeof getPlanningSlot>>
>('planning/getPlanningSlot')

export const useMovePlanningParticipants = createBackendHook<
  Parameters<typeof movePlanningParticipants>[0]['params'],
  Awaited<ReturnType<typeof movePlanningParticipants>>
>('planning/movePlanningParticipants')

export const useRemovePlanningParticipants = createBackendHook<
  Parameters<typeof removePlanningParticipants>[0]['params'],
  Awaited<ReturnType<typeof removePlanningParticipants>>
>('planning/removePlanningParticipants')

export const useSetPlanningEventStatus = createBackendHook<
  Parameters<typeof setPlanningEventStatus>[0]['params'],
  Awaited<ReturnType<typeof setPlanningEventStatus>>
>('planning/setPlanningEventStatus')

export const useSetPlanningStatus = createBackendHook<
  Parameters<typeof setPlanningStatus>[0]['params'],
  Awaited<ReturnType<typeof setPlanningStatus>>
>('planning/setPlanningStatus')

export const useUpdatePlanningAnswer = createBackendHook<
  Parameters<typeof updatePlanningAnswer>[0]['params'],
  Awaited<ReturnType<typeof updatePlanningAnswer>>
>('planning/updatePlanningAnswer')
