// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type copyPlanTemplate from '../../server/functions/plans/copyPlanTemplate'
import type deletePlanTemplate from '../../server/functions/plans/deletePlanTemplate'
import type getPlanTemplateTrainings from '../../server/functions/plans/getPlanTemplateTrainings'
import type getPlanTemplates from '../../server/functions/plans/getPlanTemplates'
import type getTrainingPlan from '../../server/functions/plans/getTrainingPlan'
import type getTrainingPlanInfo from '../../server/functions/plans/getTrainingPlanInfo'
import type getTrainingPlanTemplate from '../../server/functions/plans/getTrainingPlanTemplate'
import type linkPlanTemplate from '../../server/functions/plans/linkPlanTemplate'
import type notifyTrainingGroups from '../../server/functions/plans/notifyTrainingGroups'
import type notifyTrainingPlan from '../../server/functions/plans/notifyTrainingPlan'
import type savePlanTemplate from '../../server/functions/plans/savePlanTemplate'
import type saveTrainingPlan from '../../server/functions/plans/saveTrainingPlan'
import type unlinkPlanTemplate from '../../server/functions/plans/unlinkPlanTemplate'
import type updatePlanTemplate from '../../server/functions/plans/updatePlanTemplate'

export const useCopyPlanTemplate = createBackendHook<
  Parameters<typeof copyPlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof copyPlanTemplate>>
>('plans/copyPlanTemplate')

export const useDeletePlanTemplate = createBackendHook<
  Parameters<typeof deletePlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof deletePlanTemplate>>
>('plans/deletePlanTemplate')

export const useGetPlanTemplateTrainings = createBackendHook<
  Parameters<typeof getPlanTemplateTrainings>[0]['params'],
  Awaited<ReturnType<typeof getPlanTemplateTrainings>>
>('plans/getPlanTemplateTrainings')

export const useGetPlanTemplates = createBackendHook<
  Parameters<typeof getPlanTemplates>[0]['params'],
  Awaited<ReturnType<typeof getPlanTemplates>>
>('plans/getPlanTemplates')

export const useGetTrainingPlan = createBackendHook<
  Parameters<typeof getTrainingPlan>[0]['params'],
  Awaited<ReturnType<typeof getTrainingPlan>>
>('plans/getTrainingPlan')

export const useGetTrainingPlanInfo = createBackendHook<
  Parameters<typeof getTrainingPlanInfo>[0]['params'],
  Awaited<ReturnType<typeof getTrainingPlanInfo>>
>('plans/getTrainingPlanInfo')

export const useGetTrainingPlanTemplate = createBackendHook<
  Parameters<typeof getTrainingPlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof getTrainingPlanTemplate>>
>('plans/getTrainingPlanTemplate')

export const useLinkPlanTemplate = createBackendHook<
  Parameters<typeof linkPlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof linkPlanTemplate>>
>('plans/linkPlanTemplate')

export const useNotifyTrainingGroups = createBackendHook<
  Parameters<typeof notifyTrainingGroups>[0]['params'],
  Awaited<ReturnType<typeof notifyTrainingGroups>>
>('plans/notifyTrainingGroups')

export const useNotifyTrainingPlan = createBackendHook<
  Parameters<typeof notifyTrainingPlan>[0]['params'],
  Awaited<ReturnType<typeof notifyTrainingPlan>>
>('plans/notifyTrainingPlan')

export const useSavePlanTemplate = createBackendHook<
  Parameters<typeof savePlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof savePlanTemplate>>
>('plans/savePlanTemplate')

export const useSaveTrainingPlan = createBackendHook<
  Parameters<typeof saveTrainingPlan>[0]['params'],
  Awaited<ReturnType<typeof saveTrainingPlan>>
>('plans/saveTrainingPlan')

export const useUnlinkPlanTemplate = createBackendHook<
  Parameters<typeof unlinkPlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof unlinkPlanTemplate>>
>('plans/unlinkPlanTemplate')

export const useUpdatePlanTemplate = createBackendHook<
  Parameters<typeof updatePlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof updatePlanTemplate>>
>('plans/updatePlanTemplate')
