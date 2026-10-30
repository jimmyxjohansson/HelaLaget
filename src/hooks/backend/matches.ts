// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type addMatchParticipants from '../../server/functions/matches/addMatchParticipants'
import type addParticipant from '../../server/functions/matches/addParticipant'
import type createMatch from '../../server/functions/matches/createMatch'
import type createTeam from '../../server/functions/matches/createTeam'
import type deleteMatch from '../../server/functions/matches/deleteMatch'
import type deleteMatchEvent from '../../server/functions/matches/deleteMatchEvent'
import type finishMatch from '../../server/functions/matches/finishMatch'
import type getMatch from '../../server/functions/matches/getMatch'
import type getMatches from '../../server/functions/matches/getMatches'
import type getMatchesVsOpponent from '../../server/functions/matches/getMatchesVsOpponent'
import type getTeamsAndLeagues from '../../server/functions/matches/getTeamsAndLeagues'
import type getUpcomingMatches from '../../server/functions/matches/getUpcomingMatches'
import type notifyMatchClock from '../../server/functions/matches/notifyMatchClock'
import type removeParticipant from '../../server/functions/matches/removeParticipant'
import type removeParticipants from '../../server/functions/matches/removeParticipants'
import type saveMatchEvent from '../../server/functions/matches/saveMatchEvent'
import type syncParticipantsFromCup from '../../server/functions/matches/syncParticipantsFromCup'
import type updateMatch from '../../server/functions/matches/updateMatch'
import type updateMatchFogisRegistered from '../../server/functions/matches/updateMatchFogisRegistered'
import type updateMatchGoalkeeper from '../../server/functions/matches/updateMatchGoalkeeper'
import type updateParticipant from '../../server/functions/matches/updateParticipant'
import type updateParticipantReason from '../../server/functions/matches/updateParticipantReason'
import type updateParticipantsStatus from '../../server/functions/matches/updateParticipantsStatus'

export const useAddMatchParticipants = createBackendHook<
  Parameters<typeof addMatchParticipants>[0]['params'],
  Awaited<ReturnType<typeof addMatchParticipants>>
>('matches/addMatchParticipants')

export const useAddParticipant = createBackendHook<
  Parameters<typeof addParticipant>[0]['params'],
  Awaited<ReturnType<typeof addParticipant>>
>('matches/addParticipant')

export const useCreateMatch = createBackendHook<
  Parameters<typeof createMatch>[0]['params'],
  Awaited<ReturnType<typeof createMatch>>
>('matches/createMatch')

export const useCreateTeam = createBackendHook<
  Parameters<typeof createTeam>[0]['params'],
  Awaited<ReturnType<typeof createTeam>>
>('matches/createTeam')

export const useDeleteMatch = createBackendHook<
  Parameters<typeof deleteMatch>[0]['params'],
  Awaited<ReturnType<typeof deleteMatch>>
>('matches/deleteMatch')

export const useDeleteMatchEvent = createBackendHook<
  Parameters<typeof deleteMatchEvent>[0]['params'],
  Awaited<ReturnType<typeof deleteMatchEvent>>
>('matches/deleteMatchEvent')

export const useFinishMatch = createBackendHook<
  Parameters<typeof finishMatch>[0]['params'],
  Awaited<ReturnType<typeof finishMatch>>
>('matches/finishMatch')

export const useGetMatch = createBackendHook<
  Parameters<typeof getMatch>[0]['params'],
  Awaited<ReturnType<typeof getMatch>>
>('matches/getMatch')

export const useGetMatches = createBackendHook<
  Parameters<typeof getMatches>[0]['params'],
  Awaited<ReturnType<typeof getMatches>>
>('matches/getMatches')

export const useGetMatchesVsOpponent = createBackendHook<
  Parameters<typeof getMatchesVsOpponent>[0]['params'],
  Awaited<ReturnType<typeof getMatchesVsOpponent>>
>('matches/getMatchesVsOpponent')

export const useGetTeamsAndLeagues = createBackendHook<
  Parameters<typeof getTeamsAndLeagues>[0]['params'],
  Awaited<ReturnType<typeof getTeamsAndLeagues>>
>('matches/getTeamsAndLeagues')

export const useGetUpcomingMatches = createBackendHook<
  Parameters<typeof getUpcomingMatches>[0]['params'],
  Awaited<ReturnType<typeof getUpcomingMatches>>
>('matches/getUpcomingMatches')

export const useNotifyMatchClock = createBackendHook<
  Parameters<typeof notifyMatchClock>[0]['params'],
  Awaited<ReturnType<typeof notifyMatchClock>>
>('matches/notifyMatchClock')

export const useRemoveParticipant = createBackendHook<
  Parameters<typeof removeParticipant>[0]['params'],
  Awaited<ReturnType<typeof removeParticipant>>
>('matches/removeParticipant')

export const useRemoveParticipants = createBackendHook<
  Parameters<typeof removeParticipants>[0]['params'],
  Awaited<ReturnType<typeof removeParticipants>>
>('matches/removeParticipants')

export const useSaveMatchEvent = createBackendHook<
  Parameters<typeof saveMatchEvent>[0]['params'],
  Awaited<ReturnType<typeof saveMatchEvent>>
>('matches/saveMatchEvent')

export const useSyncParticipantsFromCup = createBackendHook<
  Parameters<typeof syncParticipantsFromCup>[0]['params'],
  Awaited<ReturnType<typeof syncParticipantsFromCup>>
>('matches/syncParticipantsFromCup')

export const useUpdateMatch = createBackendHook<
  Parameters<typeof updateMatch>[0]['params'],
  Awaited<ReturnType<typeof updateMatch>>
>('matches/updateMatch')

export const useUpdateMatchFogisRegistered = createBackendHook<
  Parameters<typeof updateMatchFogisRegistered>[0]['params'],
  Awaited<ReturnType<typeof updateMatchFogisRegistered>>
>('matches/updateMatchFogisRegistered')

export const useUpdateMatchGoalkeeper = createBackendHook<
  Parameters<typeof updateMatchGoalkeeper>[0]['params'],
  Awaited<ReturnType<typeof updateMatchGoalkeeper>>
>('matches/updateMatchGoalkeeper')

export const useUpdateParticipant = createBackendHook<
  Parameters<typeof updateParticipant>[0]['params'],
  Awaited<ReturnType<typeof updateParticipant>>
>('matches/updateParticipant')

export const useUpdateParticipantReason = createBackendHook<
  Parameters<typeof updateParticipantReason>[0]['params'],
  Awaited<ReturnType<typeof updateParticipantReason>>
>('matches/updateParticipantReason')

export const useUpdateParticipantsStatus = createBackendHook<
  Parameters<typeof updateParticipantsStatus>[0]['params'],
  Awaited<ReturnType<typeof updateParticipantsStatus>>
>('matches/updateParticipantsStatus')
