// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import 'server-only'
import type { Access, BackendRequest } from './types'
import account_getMe from './functions/account/getMe'
import account_requestJoin from './functions/account/requestJoin'
import cups_addCupParticipants from './functions/cups/addCupParticipants'
import cups_createCup from './functions/cups/createCup'
import cups_getCup from './functions/cups/getCup'
import cups_getCupAttendees from './functions/cups/getCupAttendees'
import cups_getCupParticipants from './functions/cups/getCupParticipants'
import cups_getCups from './functions/cups/getCups'
import cups_removeCupParticipants from './functions/cups/removeCupParticipants'
import cups_updateCup from './functions/cups/updateCup'
import cups_updateCupParticipantReason from './functions/cups/updateCupParticipantReason'
import cups_updateCupParticipantsStatus from './functions/cups/updateCupParticipantsStatus'
import drills_getDrills from './functions/drills/getDrills'
import leaders_createLeader from './functions/leaders/createLeader'
import leaders_getLeaders from './functions/leaders/getLeaders'
import leaders_updateLeader from './functions/leaders/updateLeader'
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
import members_decideMember from './functions/members/decideMember'
import members_getMembers from './functions/members/getMembers'
import members_getSquadSettings from './functions/members/getSquadSettings'
import members_regenerateJoinCode from './functions/members/regenerateJoinCode'
import members_removeMember from './functions/members/removeMember'
import members_updateMember from './functions/members/updateMember'
import members_updateSquadSettings from './functions/members/updateSquadSettings'
import organizations_addOrganizationAdmin from './functions/organizations/addOrganizationAdmin'
import organizations_addSquadAdmin from './functions/organizations/addSquadAdmin'
import organizations_createOrganization from './functions/organizations/createOrganization'
import organizations_createSquad from './functions/organizations/createSquad'
import organizations_getOrganizations from './functions/organizations/getOrganizations'
import players_addPlayersToSquad from './functions/players/addPlayersToSquad'
import players_createPlayer from './functions/players/createPlayer'
import players_getOrganizationPlayers from './functions/players/getOrganizationPlayers'
import players_getPlayer from './functions/players/getPlayer'
import players_getPlayers from './functions/players/getPlayers'
import players_getUpcomingBirthdays from './functions/players/getUpcomingBirthdays'
import players_removePlayerFromSquad from './functions/players/removePlayerFromSquad'
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

export const functions: Record<string, { handler: BackendFunction; access: Access }> = {
  'account/getMe': { handler: account_getMe, access: 'user' },
  'account/requestJoin': { handler: account_requestJoin, access: 'user' },
  'cups/addCupParticipants': { handler: cups_addCupParticipants, access: 'leader' },
  'cups/createCup': { handler: cups_createCup, access: 'leader' },
  'cups/getCup': { handler: cups_getCup, access: 'viewer' },
  'cups/getCupAttendees': { handler: cups_getCupAttendees, access: 'viewer' },
  'cups/getCupParticipants': { handler: cups_getCupParticipants, access: 'viewer' },
  'cups/getCups': { handler: cups_getCups, access: 'viewer' },
  'cups/removeCupParticipants': { handler: cups_removeCupParticipants, access: 'leader' },
  'cups/updateCup': { handler: cups_updateCup, access: 'leader' },
  'cups/updateCupParticipantReason': { handler: cups_updateCupParticipantReason, access: 'leader' },
  'cups/updateCupParticipantsStatus': { handler: cups_updateCupParticipantsStatus, access: 'leader' },
  'drills/getDrills': { handler: drills_getDrills, access: 'viewer' },
  'leaders/createLeader': { handler: leaders_createLeader, access: 'leader' },
  'leaders/getLeaders': { handler: leaders_getLeaders, access: 'viewer' },
  'leaders/updateLeader': { handler: leaders_updateLeader, access: 'leader' },
  'leagues/createLeague': { handler: leagues_createLeague, access: 'leader' },
  'leagues/deleteLeague': { handler: leagues_deleteLeague, access: 'leader' },
  'leagues/deleteStanding': { handler: leagues_deleteStanding, access: 'leader' },
  'leagues/getLeagueMatches': { handler: leagues_getLeagueMatches, access: 'viewer' },
  'leagues/getLeagues': { handler: leagues_getLeagues, access: 'viewer' },
  'leagues/updateLeague': { handler: leagues_updateLeague, access: 'leader' },
  'leagues/upsertStanding': { handler: leagues_upsertStanding, access: 'leader' },
  'matches/addMatchParticipants': { handler: matches_addMatchParticipants, access: 'leader' },
  'matches/addParticipant': { handler: matches_addParticipant, access: 'leader' },
  'matches/createMatch': { handler: matches_createMatch, access: 'leader' },
  'matches/createTeam': { handler: matches_createTeam, access: 'leader' },
  'matches/deleteMatch': { handler: matches_deleteMatch, access: 'leader' },
  'matches/deleteMatchEvent': { handler: matches_deleteMatchEvent, access: 'leader' },
  'matches/finishMatch': { handler: matches_finishMatch, access: 'leader' },
  'matches/getMatch': { handler: matches_getMatch, access: 'viewer' },
  'matches/getMatches': { handler: matches_getMatches, access: 'viewer' },
  'matches/getMatchesVsOpponent': { handler: matches_getMatchesVsOpponent, access: 'viewer' },
  'matches/getTeamsAndLeagues': { handler: matches_getTeamsAndLeagues, access: 'viewer' },
  'matches/getUpcomingMatches': { handler: matches_getUpcomingMatches, access: 'viewer' },
  'matches/removeParticipant': { handler: matches_removeParticipant, access: 'leader' },
  'matches/removeParticipants': { handler: matches_removeParticipants, access: 'leader' },
  'matches/saveMatchEvent': { handler: matches_saveMatchEvent, access: 'leader' },
  'matches/syncParticipantsFromCup': { handler: matches_syncParticipantsFromCup, access: 'leader' },
  'matches/updateMatch': { handler: matches_updateMatch, access: 'leader' },
  'matches/updateMatchFogisRegistered': { handler: matches_updateMatchFogisRegistered, access: 'leader' },
  'matches/updateMatchGoalkeeper': { handler: matches_updateMatchGoalkeeper, access: 'leader' },
  'matches/updateParticipant': { handler: matches_updateParticipant, access: 'leader' },
  'matches/updateParticipantReason': { handler: matches_updateParticipantReason, access: 'leader' },
  'matches/updateParticipantsStatus': { handler: matches_updateParticipantsStatus, access: 'leader' },
  'members/decideMember': { handler: members_decideMember, access: 'admin' },
  'members/getMembers': { handler: members_getMembers, access: 'admin' },
  'members/getSquadSettings': { handler: members_getSquadSettings, access: 'admin' },
  'members/regenerateJoinCode': { handler: members_regenerateJoinCode, access: 'admin' },
  'members/removeMember': { handler: members_removeMember, access: 'admin' },
  'members/updateMember': { handler: members_updateMember, access: 'admin' },
  'members/updateSquadSettings': { handler: members_updateSquadSettings, access: 'admin' },
  'organizations/addOrganizationAdmin': { handler: organizations_addOrganizationAdmin, access: 'superadmin' },
  'organizations/addSquadAdmin': { handler: organizations_addSquadAdmin, access: 'user' },
  'organizations/createOrganization': { handler: organizations_createOrganization, access: 'superadmin' },
  'organizations/createSquad': { handler: organizations_createSquad, access: 'user' },
  'organizations/getOrganizations': { handler: organizations_getOrganizations, access: 'user' },
  'players/addPlayersToSquad': { handler: players_addPlayersToSquad, access: 'leader' },
  'players/createPlayer': { handler: players_createPlayer, access: 'leader' },
  'players/getOrganizationPlayers': { handler: players_getOrganizationPlayers, access: 'leader' },
  'players/getPlayer': { handler: players_getPlayer, access: 'viewer' },
  'players/getPlayers': { handler: players_getPlayers, access: 'viewer' },
  'players/getUpcomingBirthdays': { handler: players_getUpcomingBirthdays, access: 'viewer' },
  'players/removePlayerFromSquad': { handler: players_removePlayerFromSquad, access: 'leader' },
  'players/updatePlayer': { handler: players_updatePlayer, access: 'leader' },
  'teams/createTeam': { handler: teams_createTeam, access: 'leader' },
  'teams/deleteTeam': { handler: teams_deleteTeam, access: 'leader' },
  'teams/getTeams': { handler: teams_getTeams, access: 'viewer' },
  'teams/updateTeam': { handler: teams_updateTeam, access: 'leader' },
  'trainings/addLeader': { handler: trainings_addLeader, access: 'leader' },
  'trainings/addLeaders': { handler: trainings_addLeaders, access: 'leader' },
  'trainings/addParticipant': { handler: trainings_addParticipant, access: 'leader' },
  'trainings/addParticipants': { handler: trainings_addParticipants, access: 'leader' },
  'trainings/copyTraining': { handler: trainings_copyTraining, access: 'leader' },
  'trainings/createTraining': { handler: trainings_createTraining, access: 'leader' },
  'trainings/deleteTraining': { handler: trainings_deleteTraining, access: 'leader' },
  'trainings/getAvailableLeaders': { handler: trainings_getAvailableLeaders, access: 'viewer' },
  'trainings/getAvailablePlayers': { handler: trainings_getAvailablePlayers, access: 'viewer' },
  'trainings/getPlayerTrainings': { handler: trainings_getPlayerTrainings, access: 'viewer' },
  'trainings/getStats': { handler: trainings_getStats, access: 'viewer' },
  'trainings/getTrainingAttendance': { handler: trainings_getTrainingAttendance, access: 'viewer' },
  'trainings/getTrainingDetail': { handler: trainings_getTrainingDetail, access: 'viewer' },
  'trainings/getTrainingGroups': { handler: trainings_getTrainingGroups, access: 'viewer' },
  'trainings/getTrainings': { handler: trainings_getTrainings, access: 'viewer' },
  'trainings/markAsReported': { handler: trainings_markAsReported, access: 'leader' },
  'trainings/removeLeader': { handler: trainings_removeLeader, access: 'leader' },
  'trainings/removeParticipant': { handler: trainings_removeParticipant, access: 'leader' },
  'trainings/updateAttendanceStatus': { handler: trainings_updateAttendanceStatus, access: 'leader' },
  'trainings/updateGroupRank': { handler: trainings_updateGroupRank, access: 'leader' },
  'trainings/updateLeaderReason': { handler: trainings_updateLeaderReason, access: 'leader' },
  'trainings/updateLeaderStatus': { handler: trainings_updateLeaderStatus, access: 'leader' },
  'trainings/updateParticipantGroups': { handler: trainings_updateParticipantGroups, access: 'leader' },
  'trainings/updateParticipantReason': { handler: trainings_updateParticipantReason, access: 'leader' },
  'trainings/updateTraining': { handler: trainings_updateTraining, access: 'leader' },
}
