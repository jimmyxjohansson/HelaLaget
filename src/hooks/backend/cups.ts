// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type addCupParticipants from '../../server/functions/cups/addCupParticipants'
import type createCup from '../../server/functions/cups/createCup'
import type finishCup from '../../server/functions/cups/finishCup'
import type getCup from '../../server/functions/cups/getCup'
import type getCupAttendees from '../../server/functions/cups/getCupAttendees'
import type getCupParticipants from '../../server/functions/cups/getCupParticipants'
import type getCups from '../../server/functions/cups/getCups'
import type removeCupParticipants from '../../server/functions/cups/removeCupParticipants'
import type updateCup from '../../server/functions/cups/updateCup'
import type updateCupParticipantReason from '../../server/functions/cups/updateCupParticipantReason'
import type updateCupParticipantsStatus from '../../server/functions/cups/updateCupParticipantsStatus'

export const useAddCupParticipants = createBackendHook<
  Parameters<typeof addCupParticipants>[0]['params'],
  Awaited<ReturnType<typeof addCupParticipants>>
>('cups/addCupParticipants')

export const useCreateCup = createBackendHook<
  Parameters<typeof createCup>[0]['params'],
  Awaited<ReturnType<typeof createCup>>
>('cups/createCup')

export const useFinishCup = createBackendHook<
  Parameters<typeof finishCup>[0]['params'],
  Awaited<ReturnType<typeof finishCup>>
>('cups/finishCup')

export const useGetCup = createBackendHook<
  Parameters<typeof getCup>[0]['params'],
  Awaited<ReturnType<typeof getCup>>
>('cups/getCup')

export const useGetCupAttendees = createBackendHook<
  Parameters<typeof getCupAttendees>[0]['params'],
  Awaited<ReturnType<typeof getCupAttendees>>
>('cups/getCupAttendees')

export const useGetCupParticipants = createBackendHook<
  Parameters<typeof getCupParticipants>[0]['params'],
  Awaited<ReturnType<typeof getCupParticipants>>
>('cups/getCupParticipants')

export const useGetCups = createBackendHook<
  Parameters<typeof getCups>[0]['params'],
  Awaited<ReturnType<typeof getCups>>
>('cups/getCups')

export const useRemoveCupParticipants = createBackendHook<
  Parameters<typeof removeCupParticipants>[0]['params'],
  Awaited<ReturnType<typeof removeCupParticipants>>
>('cups/removeCupParticipants')

export const useUpdateCup = createBackendHook<
  Parameters<typeof updateCup>[0]['params'],
  Awaited<ReturnType<typeof updateCup>>
>('cups/updateCup')

export const useUpdateCupParticipantReason = createBackendHook<
  Parameters<typeof updateCupParticipantReason>[0]['params'],
  Awaited<ReturnType<typeof updateCupParticipantReason>>
>('cups/updateCupParticipantReason')

export const useUpdateCupParticipantsStatus = createBackendHook<
  Parameters<typeof updateCupParticipantsStatus>[0]['params'],
  Awaited<ReturnType<typeof updateCupParticipantsStatus>>
>('cups/updateCupParticipantsStatus')
