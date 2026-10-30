// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import 'server-only'
import type { BackendRequest } from './types'
import cups_addCupParticipants from './functions/cups/addCupParticipants'
import cups_getCup from './functions/cups/getCup'
import cups_getCupAttendees from './functions/cups/getCupAttendees'
import cups_getCupParticipants from './functions/cups/getCupParticipants'
import cups_getCups from './functions/cups/getCups'
import cups_removeCupParticipants from './functions/cups/removeCupParticipants'
import cups_updateCup from './functions/cups/updateCup'
import cups_updateCupParticipantReason from './functions/cups/updateCupParticipantReason'
import cups_updateCupParticipantsStatus from './functions/cups/updateCupParticipantsStatus'
import drills_getDrills from './functions/drills/getDrills'
import leagues_createLeague from './functions/leagues/createLeague'
import leagues_deleteLeague from './functions/leagues/deleteLeague'
import leagues_deleteStanding from './functions/leagues/deleteStanding'
import leagues_getLeagueMatches from './functions/leagues/getLeagueMatches'
import leagues_getLeagues from './functions/leagues/getLeagues'
import leagues_updateLeague from './functions/leagues/updateLeague'
import leagues_upsertStanding from './functions/leagues/upsertStanding'
import matches_addMatchParticipants from './functions/matches/addMatchParticipants'
import matches_addParticipant from './functions/matches/addParticipant'
import matches_createMatch from './functions/matches/createMatch'
import matches_createTeam from './functions/matches/createTeam'
import matches_deleteMatch from './functions/matches/deleteMatch'
import matches_deleteMatchEvent from './functions/matches/deleteMatchEvent'
import matches_finishMatch from './functions/matches/finishMatch'
import matches_getMatch from './functions/matches/getMatch'
import matches_getMatches from './functions/matches/getMatches'
import matches_getMatchesVsOpponent from './functions/matches/getMatchesVsOpponent'
import matches_getTeamsAndLeagues from './functions/matches/getTeamsAndLeagues'
import matches_getUpcomingMatches from './functions/matches/getUpcomingMatches'
import matches_removeParticipant from './functions/matches/removeParticipant'
import matches_removeParticipants from './functions/matches/removeParticipants'
import matches_saveMatchEvent from './functions/matches/saveMatchEvent'
import matches_syncParticipantsFromCup from './functions/matches/syncParticipantsFromCup'
import matches_updateMatch from './functions/matches/updateMatch'
import matches_updateMatchFogisRegistered from './functions/matches/updateMatchFogisRegistered'
import matches_updateMatchGoalkeeper from './functions/matches/updateMatchGoalkeeper'
import matches_updateParticipant from './functions/matches/updateParticipant'
import matches_updateParticipantReason from './functions/matches/updateParticipantReason'
import matches_updateParticipantsStatus from './functions/matches/updateParticipantsStatus'
import players_getPlayer from './functions/players/getPlayer'
import players_getPlayers from './functions/players/getPlayers'
import players_getUpcomingBirthdays from './functions/players/getUpcomingBirthdays'
import players_updatePlayer from './functions/players/updatePlayer'
import teams_createTeam from './functions/teams/createTeam'
import teams_deleteTeam from './functions/teams/deleteTeam'
import teams_getTeams from './functions/teams/getTeams'
import teams_updateTeam from './functions/teams/updateTeam'
import trainings_addLeader from './functions/trainings/addLeader'
import trainings_addLeaders from './functions/trainings/addLeaders'
import trainings_addParticipant from './functions/trainings/addParticipant'
import trainings_addParticipants from './functions/trainings/addParticipants'
import trainings_copyTraining from './functions/trainings/copyTraining'
import trainings_createTraining from './functions/trainings/createTraining'
import trainings_deleteTraining from './functions/trainings/deleteTraining'
import trainings_getAvailableLeaders from './functions/trainings/getAvailableLeaders'
import trainings_getAvailablePlayers from './functions/trainings/getAvailablePlayers'
import trainings_getPlayerTrainings from './functions/trainings/getPlayerTrainings'
import trainings_getStats from './functions/trainings/getStats'
import trainings_getTrainingAttendance from './functions/trainings/getTrainingAttendance'
import trainings_getTrainingDetail from './functions/trainings/getTrainingDetail'
import trainings_getTrainingGroups from './functions/trainings/getTrainingGroups'
import trainings_getTrainings from './functions/trainings/getTrainings'
import trainings_markAsReported from './functions/trainings/markAsReported'
import trainings_removeLeader from './functions/trainings/removeLeader'
import trainings_removeParticipant from './functions/trainings/removeParticipant'
import trainings_updateAttendanceStatus from './functions/trainings/updateAttendanceStatus'
import trainings_updateGroupRank from './functions/trainings/updateGroupRank'
import trainings_updateLeaderReason from './functions/trainings/updateLeaderReason'
import trainings_updateLeaderStatus from './functions/trainings/updateLeaderStatus'
import trainings_updateParticipantGroups from './functions/trainings/updateParticipantGroups'
import trainings_updateParticipantReason from './functions/trainings/updateParticipantReason'
import trainings_updateTraining from './functions/trainings/updateTraining'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BackendFunction = (req: BackendRequest<any>) => Promise<unknown>

export const functions: Record<string, BackendFunction> = {
  'cups/addCupParticipants': cups_addCupParticipants,
  'cups/getCup': cups_getCup,
  'cups/getCupAttendees': cups_getCupAttendees,
  'cups/getCupParticipants': cups_getCupParticipants,
  'cups/getCups': cups_getCups,
  'cups/removeCupParticipants': cups_removeCupParticipants,
  'cups/updateCup': cups_updateCup,
  'cups/updateCupParticipantReason': cups_updateCupParticipantReason,
  'cups/updateCupParticipantsStatus': cups_updateCupParticipantsStatus,
  'drills/getDrills': drills_getDrills,
  'leagues/createLeague': leagues_createLeague,
  'leagues/deleteLeague': leagues_deleteLeague,
  'leagues/deleteStanding': leagues_deleteStanding,
  'leagues/getLeagueMatches': leagues_getLeagueMatches,
  'leagues/getLeagues': leagues_getLeagues,
  'leagues/updateLeague': leagues_updateLeague,
  'leagues/upsertStanding': leagues_upsertStanding,
  'matches/addMatchParticipants': matches_addMatchParticipants,
  'matches/addParticipant': matches_addParticipant,
  'matches/createMatch': matches_createMatch,
  'matches/createTeam': matches_createTeam,
  'matches/deleteMatch': matches_deleteMatch,
  'matches/deleteMatchEvent': matches_deleteMatchEvent,
  'matches/finishMatch': matches_finishMatch,
  'matches/getMatch': matches_getMatch,
  'matches/getMatches': matches_getMatches,
  'matches/getMatchesVsOpponent': matches_getMatchesVsOpponent,
  'matches/getTeamsAndLeagues': matches_getTeamsAndLeagues,
  'matches/getUpcomingMatches': matches_getUpcomingMatches,
  'matches/removeParticipant': matches_removeParticipant,
  'matches/removeParticipants': matches_removeParticipants,
  'matches/saveMatchEvent': matches_saveMatchEvent,
  'matches/syncParticipantsFromCup': matches_syncParticipantsFromCup,
  'matches/updateMatch': matches_updateMatch,
  'matches/updateMatchFogisRegistered': matches_updateMatchFogisRegistered,
  'matches/updateMatchGoalkeeper': matches_updateMatchGoalkeeper,
  'matches/updateParticipant': matches_updateParticipant,
  'matches/updateParticipantReason': matches_updateParticipantReason,
  'matches/updateParticipantsStatus': matches_updateParticipantsStatus,
  'players/getPlayer': players_getPlayer,
  'players/getPlayers': players_getPlayers,
  'players/getUpcomingBirthdays': players_getUpcomingBirthdays,
  'players/updatePlayer': players_updatePlayer,
  'teams/createTeam': teams_createTeam,
  'teams/deleteTeam': teams_deleteTeam,
  'teams/getTeams': teams_getTeams,
  'teams/updateTeam': teams_updateTeam,
  'trainings/addLeader': trainings_addLeader,
  'trainings/addLeaders': trainings_addLeaders,
  'trainings/addParticipant': trainings_addParticipant,
  'trainings/addParticipants': trainings_addParticipants,
  'trainings/copyTraining': trainings_copyTraining,
  'trainings/createTraining': trainings_createTraining,
  'trainings/deleteTraining': trainings_deleteTraining,
  'trainings/getAvailableLeaders': trainings_getAvailableLeaders,
  'trainings/getAvailablePlayers': trainings_getAvailablePlayers,
  'trainings/getPlayerTrainings': trainings_getPlayerTrainings,
  'trainings/getStats': trainings_getStats,
  'trainings/getTrainingAttendance': trainings_getTrainingAttendance,
  'trainings/getTrainingDetail': trainings_getTrainingDetail,
  'trainings/getTrainingGroups': trainings_getTrainingGroups,
  'trainings/getTrainings': trainings_getTrainings,
  'trainings/markAsReported': trainings_markAsReported,
  'trainings/removeLeader': trainings_removeLeader,
  'trainings/removeParticipant': trainings_removeParticipant,
  'trainings/updateAttendanceStatus': trainings_updateAttendanceStatus,
  'trainings/updateGroupRank': trainings_updateGroupRank,
  'trainings/updateLeaderReason': trainings_updateLeaderReason,
  'trainings/updateLeaderStatus': trainings_updateLeaderStatus,
  'trainings/updateParticipantGroups': trainings_updateParticipantGroups,
  'trainings/updateParticipantReason': trainings_updateParticipantReason,
  'trainings/updateTraining': trainings_updateTraining,
}
