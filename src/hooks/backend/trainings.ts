// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type addLeader from '../../server/functions/trainings/addLeader'
import type addLeaders from '../../server/functions/trainings/addLeaders'
import type addParticipant from '../../server/functions/trainings/addParticipant'
import type addParticipants from '../../server/functions/trainings/addParticipants'
import type copyTraining from '../../server/functions/trainings/copyTraining'
import type createTraining from '../../server/functions/trainings/createTraining'
import type deleteTraining from '../../server/functions/trainings/deleteTraining'
import type getAvailableLeaders from '../../server/functions/trainings/getAvailableLeaders'
import type getAvailablePlayers from '../../server/functions/trainings/getAvailablePlayers'
import type getPlayerTrainings from '../../server/functions/trainings/getPlayerTrainings'
import type getStats from '../../server/functions/trainings/getStats'
import type getTrainingAttendance from '../../server/functions/trainings/getTrainingAttendance'
import type getTrainingDetail from '../../server/functions/trainings/getTrainingDetail'
import type getTrainingGroups from '../../server/functions/trainings/getTrainingGroups'
import type getTrainings from '../../server/functions/trainings/getTrainings'
import type markAsReported from '../../server/functions/trainings/markAsReported'
import type removeLeader from '../../server/functions/trainings/removeLeader'
import type removeParticipant from '../../server/functions/trainings/removeParticipant'
import type updateAttendanceStatus from '../../server/functions/trainings/updateAttendanceStatus'
import type updateGroupRank from '../../server/functions/trainings/updateGroupRank'
import type updateLeaderReason from '../../server/functions/trainings/updateLeaderReason'
import type updateLeaderStatus from '../../server/functions/trainings/updateLeaderStatus'
import type updateParticipantGroups from '../../server/functions/trainings/updateParticipantGroups'
import type updateParticipantReason from '../../server/functions/trainings/updateParticipantReason'
import type updateTraining from '../../server/functions/trainings/updateTraining'

export const useAddLeader = createBackendHook<
  Parameters<typeof addLeader>[0]['params'],
  Awaited<ReturnType<typeof addLeader>>
>('trainings/addLeader')

export const useAddLeaders = createBackendHook<
  Parameters<typeof addLeaders>[0]['params'],
  Awaited<ReturnType<typeof addLeaders>>
>('trainings/addLeaders')

export const useAddParticipant = createBackendHook<
  Parameters<typeof addParticipant>[0]['params'],
  Awaited<ReturnType<typeof addParticipant>>
>('trainings/addParticipant')

export const useAddParticipants = createBackendHook<
  Parameters<typeof addParticipants>[0]['params'],
  Awaited<ReturnType<typeof addParticipants>>
>('trainings/addParticipants')

export const useCopyTraining = createBackendHook<
  Parameters<typeof copyTraining>[0]['params'],
  Awaited<ReturnType<typeof copyTraining>>
>('trainings/copyTraining')

export const useCreateTraining = createBackendHook<
  Parameters<typeof createTraining>[0]['params'],
  Awaited<ReturnType<typeof createTraining>>
>('trainings/createTraining')

export const useDeleteTraining = createBackendHook<
  Parameters<typeof deleteTraining>[0]['params'],
  Awaited<ReturnType<typeof deleteTraining>>
>('trainings/deleteTraining')

export const useGetAvailableLeaders = createBackendHook<
  Parameters<typeof getAvailableLeaders>[0]['params'],
  Awaited<ReturnType<typeof getAvailableLeaders>>
>('trainings/getAvailableLeaders')

export const useGetAvailablePlayers = createBackendHook<
  Parameters<typeof getAvailablePlayers>[0]['params'],
  Awaited<ReturnType<typeof getAvailablePlayers>>
>('trainings/getAvailablePlayers')

export const useGetPlayerTrainings = createBackendHook<
  Parameters<typeof getPlayerTrainings>[0]['params'],
  Awaited<ReturnType<typeof getPlayerTrainings>>
>('trainings/getPlayerTrainings')

export const useGetStats = createBackendHook<
  Parameters<typeof getStats>[0]['params'],
  Awaited<ReturnType<typeof getStats>>
>('trainings/getStats')

export const useGetTrainingAttendance = createBackendHook<
  Parameters<typeof getTrainingAttendance>[0]['params'],
  Awaited<ReturnType<typeof getTrainingAttendance>>
>('trainings/getTrainingAttendance')

export const useGetTrainingDetail = createBackendHook<
  Parameters<typeof getTrainingDetail>[0]['params'],
  Awaited<ReturnType<typeof getTrainingDetail>>
>('trainings/getTrainingDetail')

export const useGetTrainingGroups = createBackendHook<
  Parameters<typeof getTrainingGroups>[0]['params'],
  Awaited<ReturnType<typeof getTrainingGroups>>
>('trainings/getTrainingGroups')

export const useGetTrainings = createBackendHook<
  Parameters<typeof getTrainings>[0]['params'],
  Awaited<ReturnType<typeof getTrainings>>
>('trainings/getTrainings')

export const useMarkAsReported = createBackendHook<
  Parameters<typeof markAsReported>[0]['params'],
  Awaited<ReturnType<typeof markAsReported>>
>('trainings/markAsReported')

export const useRemoveLeader = createBackendHook<
  Parameters<typeof removeLeader>[0]['params'],
  Awaited<ReturnType<typeof removeLeader>>
>('trainings/removeLeader')

export const useRemoveParticipant = createBackendHook<
  Parameters<typeof removeParticipant>[0]['params'],
  Awaited<ReturnType<typeof removeParticipant>>
>('trainings/removeParticipant')

export const useUpdateAttendanceStatus = createBackendHook<
  Parameters<typeof updateAttendanceStatus>[0]['params'],
  Awaited<ReturnType<typeof updateAttendanceStatus>>
>('trainings/updateAttendanceStatus')

export const useUpdateGroupRank = createBackendHook<
  Parameters<typeof updateGroupRank>[0]['params'],
  Awaited<ReturnType<typeof updateGroupRank>>
>('trainings/updateGroupRank')

export const useUpdateLeaderReason = createBackendHook<
  Parameters<typeof updateLeaderReason>[0]['params'],
  Awaited<ReturnType<typeof updateLeaderReason>>
>('trainings/updateLeaderReason')

export const useUpdateLeaderStatus = createBackendHook<
  Parameters<typeof updateLeaderStatus>[0]['params'],
  Awaited<ReturnType<typeof updateLeaderStatus>>
>('trainings/updateLeaderStatus')

export const useUpdateParticipantGroups = createBackendHook<
  Parameters<typeof updateParticipantGroups>[0]['params'],
  Awaited<ReturnType<typeof updateParticipantGroups>>
>('trainings/updateParticipantGroups')

export const useUpdateParticipantReason = createBackendHook<
  Parameters<typeof updateParticipantReason>[0]['params'],
  Awaited<ReturnType<typeof updateParticipantReason>>
>('trainings/updateParticipantReason')

export const useUpdateTraining = createBackendHook<
  Parameters<typeof updateTraining>[0]['params'],
  Awaited<ReturnType<typeof updateTraining>>
>('trainings/updateTraining')
