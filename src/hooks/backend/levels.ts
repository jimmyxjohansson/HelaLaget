// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type getLevelAssessments from '../../server/functions/levels/getLevelAssessments'
import type saveLevelAssessment from '../../server/functions/levels/saveLevelAssessment'

export const useGetLevelAssessments = createBackendHook<
  Parameters<typeof getLevelAssessments>[0]['params'],
  Awaited<ReturnType<typeof getLevelAssessments>>
>('levels/getLevelAssessments')

export const useSaveLevelAssessment = createBackendHook<
  Parameters<typeof saveLevelAssessment>[0]['params'],
  Awaited<ReturnType<typeof saveLevelAssessment>>
>('levels/saveLevelAssessment')
