// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type deletePlanTemplate from '../../server/functions/plans/deletePlanTemplate'
import type getPlanTemplates from '../../server/functions/plans/getPlanTemplates'
import type getTrainingPlan from '../../server/functions/plans/getTrainingPlan'
import type notifyTrainingPlan from '../../server/functions/plans/notifyTrainingPlan'
import type savePlanTemplate from '../../server/functions/plans/savePlanTemplate'
import type saveTrainingPlan from '../../server/functions/plans/saveTrainingPlan'

export const useDeletePlanTemplate = createBackendHook<
  Parameters<typeof deletePlanTemplate>[0]['params'],
  Awaited<ReturnType<typeof deletePlanTemplate>>
>('plans/deletePlanTemplate')

export const useGetPlanTemplates = createBackendHook<
  Parameters<typeof getPlanTemplates>[0]['params'],
  Awaited<ReturnType<typeof getPlanTemplates>>
>('plans/getPlanTemplates')

export const useGetTrainingPlan = createBackendHook<
  Parameters<typeof getTrainingPlan>[0]['params'],
  Awaited<ReturnType<typeof getTrainingPlan>>
>('plans/getTrainingPlan')

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
