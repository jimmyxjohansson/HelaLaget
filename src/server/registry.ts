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
import drills_deleteDrill from './functions/drills/deleteDrill'
import drills_getDrill from './functions/drills/getDrill'
import drills_getDrills from './functions/drills/getDrills'
import drills_importStarterDrills from './functions/drills/importStarterDrills'
import drills_saveDrill from './functions/drills/saveDrill'
import infos_deleteSquadInfo from './functions/infos/deleteSquadInfo'
import infos_getSquadInfos from './functions/infos/getSquadInfos'
import infos_moveSquadInfo from './functions/infos/moveSquadInfo'
import infos_saveSquadInfo from './functions/infos/saveSquadInfo'
import leaders_addLeadersToSquad from './functions/leaders/addLeadersToSquad'
import leaders_createLeader from './functions/leaders/createLeader'
import leaders_getLeaders from './functions/leaders/getLeaders'
import leaders_getOrganizationLeaders from './functions/leaders/getOrganizationLeaders'
import leaders_removeLeaderFromSquad from './functions/leaders/removeLeaderFromSquad'
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
import matches_deleteMatchCard from './functions/matches/deleteMatchCard'
import matches_deleteMatchEvent from './functions/matches/deleteMatchEvent'
import matches_finishMatch from './functions/matches/finishMatch'
import matches_getMatch from './functions/matches/getMatch'
import matches_getMatches from './functions/matches/getMatches'
import matches_getMatchesVsOpponent from './functions/matches/getMatchesVsOpponent'
import matches_getTeamsAndLeagues from './functions/matches/getTeamsAndLeagues'
import matches_getUpcomingMatches from './functions/matches/getUpcomingMatches'
import matches_removeParticipant from './functions/matches/removeParticipant'
import matches_removeParticipants from './functions/matches/removeParticipants'
import matches_saveMatchCard from './functions/matches/saveMatchCard'
import matches_saveMatchEvent from './functions/matches/saveMatchEvent'
import matches_setMatchClock from './functions/matches/setMatchClock'
import matches_setMatchMuted from './functions/matches/setMatchMuted'
import matches_syncParticipantsFromCup from './functions/matches/syncParticipantsFromCup'
import matches_updateMatch from './functions/matches/updateMatch'
import matches_updateMatchFogisRegistered from './functions/matches/updateMatchFogisRegistered'
import matches_updateMatchGoalkeeper from './functions/matches/updateMatchGoalkeeper'
import matches_updateParticipant from './functions/matches/updateParticipant'
import matches_updateParticipantReason from './functions/matches/updateParticipantReason'
import matches_updateParticipantsStatus from './functions/matches/updateParticipantsStatus'
import members_decideMember from './functions/members/decideMember'
import members_getLinkablePlayers from './functions/members/getLinkablePlayers'
import members_getMembers from './functions/members/getMembers'
import members_getSquadSettings from './functions/members/getSquadSettings'
import members_regenerateJoinCode from './functions/members/regenerateJoinCode'
import members_removeMember from './functions/members/removeMember'
import members_updateMember from './functions/members/updateMember'
import members_updateSquadSettings from './functions/members/updateSquadSettings'
import notifications_getPushLog from './functions/notifications/getPushLog'
import notifications_getPushStatus from './functions/notifications/getPushStatus'
import notifications_sendTestPush from './functions/notifications/sendTestPush'
import notifications_setPushSquad from './functions/notifications/setPushSquad'
import notifications_subscribePush from './functions/notifications/subscribePush'
import notifications_unsubscribePush from './functions/notifications/unsubscribePush'
import organizations_addOrganizationAdmin from './functions/organizations/addOrganizationAdmin'
import organizations_addSquadAdmin from './functions/organizations/addSquadAdmin'
import organizations_createOrganization from './functions/organizations/createOrganization'
import organizations_createSquad from './functions/organizations/createSquad'
import organizations_getOrganizations from './functions/organizations/getOrganizations'
import planning_addPlanningLeaders from './functions/planning/addPlanningLeaders'
import planning_addPlanningPlayers from './functions/planning/addPlanningPlayers'
import planning_getPlanningAnswers from './functions/planning/getPlanningAnswers'
import planning_getPlanningCandidates from './functions/planning/getPlanningCandidates'
import planning_getPlanningEvents from './functions/planning/getPlanningEvents'
import planning_getPlanningSlot from './functions/planning/getPlanningSlot'
import planning_movePlanningParticipants from './functions/planning/movePlanningParticipants'
import planning_removePlanningParticipants from './functions/planning/removePlanningParticipants'
import planning_setPlanningEventStatus from './functions/planning/setPlanningEventStatus'
import planning_setPlanningGoalkeeper from './functions/planning/setPlanningGoalkeeper'
import planning_setPlanningStatus from './functions/planning/setPlanningStatus'
import planning_updatePlanningAnswer from './functions/planning/updatePlanningAnswer'
import plans_deletePlanTemplate from './functions/plans/deletePlanTemplate'
import plans_getPlanTemplateTrainings from './functions/plans/getPlanTemplateTrainings'
import plans_getPlanTemplates from './functions/plans/getPlanTemplates'
import plans_getTrainingPlan from './functions/plans/getTrainingPlan'
import plans_getTrainingPlanInfo from './functions/plans/getTrainingPlanInfo'
import plans_getTrainingPlanTemplate from './functions/plans/getTrainingPlanTemplate'
import plans_linkPlanTemplate from './functions/plans/linkPlanTemplate'
import plans_notifyTrainingGroups from './functions/plans/notifyTrainingGroups'
import plans_notifyTrainingPlan from './functions/plans/notifyTrainingPlan'
import plans_savePlanTemplate from './functions/plans/savePlanTemplate'
import plans_saveTrainingPlan from './functions/plans/saveTrainingPlan'
import plans_unlinkPlanTemplate from './functions/plans/unlinkPlanTemplate'
import plans_updatePlanTemplate from './functions/plans/updatePlanTemplate'
import players_addPlayersToSquad from './functions/players/addPlayersToSquad'
import players_createPlayer from './functions/players/createPlayer'
import players_getOrganizationPlayers from './functions/players/getOrganizationPlayers'
import players_getPlayer from './functions/players/getPlayer'
import players_getPlayerStats from './functions/players/getPlayerStats'
import players_getPlayers from './functions/players/getPlayers'
import players_getSquadGenders from './functions/players/getSquadGenders'
import players_getSquadStatuses from './functions/players/getSquadStatuses'
import players_getUpcomingBirthdays from './functions/players/getUpcomingBirthdays'
import players_removePlayerFromSquad from './functions/players/removePlayerFromSquad'
import players_updatePlayer from './functions/players/updatePlayer'
import replies_applySvenskalagReplies from './functions/replies/applySvenskalagReplies'
import replies_findSvenskalagActivity from './functions/replies/findSvenskalagActivity'
import replies_previewSvenskalagReplies from './functions/replies/previewSvenskalagReplies'
import replies_syncSvenskalagReplies from './functions/replies/syncSvenskalagReplies'
import stats_getStatsEvents from './functions/stats/getStatsEvents'
import stats_getStatsMatches from './functions/stats/getStatsMatches'
import stats_getStatsOpponents from './functions/stats/getStatsOpponents'
import stats_getStatsTrainings from './functions/stats/getStatsTrainings'
import svenskalag_acknowledgeRemovedEvent from './functions/svenskalag/acknowledgeRemovedEvent'
import svenskalag_decideSvenskalagEvent from './functions/svenskalag/decideSvenskalagEvent'
import svenskalag_getSvenskalagStatus from './functions/svenskalag/getSvenskalagStatus'
import svenskalag_syncSvenskalag from './functions/svenskalag/syncSvenskalag'
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
  'drills/deleteDrill': { handler: drills_deleteDrill, access: 'leader' },
  'drills/getDrill': { handler: drills_getDrill, access: 'viewer' },
  'drills/getDrills': { handler: drills_getDrills, access: 'viewer' },
  'drills/importStarterDrills': { handler: drills_importStarterDrills, access: 'leader' },
  'drills/saveDrill': { handler: drills_saveDrill, access: 'leader' },
  'infos/deleteSquadInfo': { handler: infos_deleteSquadInfo, access: 'admin' },
  'infos/getSquadInfos': { handler: infos_getSquadInfos, access: 'viewer' },
  'infos/moveSquadInfo': { handler: infos_moveSquadInfo, access: 'admin' },
  'infos/saveSquadInfo': { handler: infos_saveSquadInfo, access: 'admin' },
  'leaders/addLeadersToSquad': { handler: leaders_addLeadersToSquad, access: 'leader' },
  'leaders/createLeader': { handler: leaders_createLeader, access: 'leader' },
  'leaders/getLeaders': { handler: leaders_getLeaders, access: 'viewer' },
  'leaders/getOrganizationLeaders': { handler: leaders_getOrganizationLeaders, access: 'leader' },
  'leaders/removeLeaderFromSquad': { handler: leaders_removeLeaderFromSquad, access: 'leader' },
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
  'matches/deleteMatchCard': { handler: matches_deleteMatchCard, access: 'leader' },
  'matches/deleteMatchEvent': { handler: matches_deleteMatchEvent, access: 'leader' },
  'matches/finishMatch': { handler: matches_finishMatch, access: 'leader' },
  'matches/getMatch': { handler: matches_getMatch, access: 'viewer' },
  'matches/getMatches': { handler: matches_getMatches, access: 'viewer' },
  'matches/getMatchesVsOpponent': { handler: matches_getMatchesVsOpponent, access: 'viewer' },
  'matches/getTeamsAndLeagues': { handler: matches_getTeamsAndLeagues, access: 'viewer' },
  'matches/getUpcomingMatches': { handler: matches_getUpcomingMatches, access: 'viewer' },
  'matches/removeParticipant': { handler: matches_removeParticipant, access: 'leader' },
  'matches/removeParticipants': { handler: matches_removeParticipants, access: 'leader' },
  'matches/saveMatchCard': { handler: matches_saveMatchCard, access: 'leader' },
  'matches/saveMatchEvent': { handler: matches_saveMatchEvent, access: 'leader' },
  'matches/setMatchClock': { handler: matches_setMatchClock, access: 'leader' },
  'matches/setMatchMuted': { handler: matches_setMatchMuted, access: 'leader' },
  'matches/syncParticipantsFromCup': { handler: matches_syncParticipantsFromCup, access: 'leader' },
  'matches/updateMatch': { handler: matches_updateMatch, access: 'leader' },
  'matches/updateMatchFogisRegistered': { handler: matches_updateMatchFogisRegistered, access: 'leader' },
  'matches/updateMatchGoalkeeper': { handler: matches_updateMatchGoalkeeper, access: 'leader' },
  'matches/updateParticipant': { handler: matches_updateParticipant, access: 'leader' },
  'matches/updateParticipantReason': { handler: matches_updateParticipantReason, access: 'leader' },
  'matches/updateParticipantsStatus': { handler: matches_updateParticipantsStatus, access: 'leader' },
  'members/decideMember': { handler: members_decideMember, access: 'admin' },
  'members/getLinkablePlayers': { handler: members_getLinkablePlayers, access: 'admin' },
  'members/getMembers': { handler: members_getMembers, access: 'admin' },
  'members/getSquadSettings': { handler: members_getSquadSettings, access: 'admin' },
  'members/regenerateJoinCode': { handler: members_regenerateJoinCode, access: 'admin' },
  'members/removeMember': { handler: members_removeMember, access: 'admin' },
  'members/updateMember': { handler: members_updateMember, access: 'admin' },
  'members/updateSquadSettings': { handler: members_updateSquadSettings, access: 'admin' },
  'notifications/getPushLog': { handler: notifications_getPushLog, access: 'admin' },
  'notifications/getPushStatus': { handler: notifications_getPushStatus, access: 'user' },
  'notifications/sendTestPush': { handler: notifications_sendTestPush, access: 'user' },
  'notifications/setPushSquad': { handler: notifications_setPushSquad, access: 'user' },
  'notifications/subscribePush': { handler: notifications_subscribePush, access: 'user' },
  'notifications/unsubscribePush': { handler: notifications_unsubscribePush, access: 'user' },
  'organizations/addOrganizationAdmin': { handler: organizations_addOrganizationAdmin, access: 'superadmin' },
  'organizations/addSquadAdmin': { handler: organizations_addSquadAdmin, access: 'user' },
  'organizations/createOrganization': { handler: organizations_createOrganization, access: 'superadmin' },
  'organizations/createSquad': { handler: organizations_createSquad, access: 'user' },
  'organizations/getOrganizations': { handler: organizations_getOrganizations, access: 'user' },
  'planning/addPlanningLeaders': { handler: planning_addPlanningLeaders, access: 'leader' },
  'planning/addPlanningPlayers': { handler: planning_addPlanningPlayers, access: 'leader' },
  'planning/getPlanningAnswers': { handler: planning_getPlanningAnswers, access: 'leader' },
  'planning/getPlanningCandidates': { handler: planning_getPlanningCandidates, access: 'leader' },
  'planning/getPlanningEvents': { handler: planning_getPlanningEvents, access: 'leader' },
  'planning/getPlanningSlot': { handler: planning_getPlanningSlot, access: 'leader' },
  'planning/movePlanningParticipants': { handler: planning_movePlanningParticipants, access: 'leader' },
  'planning/removePlanningParticipants': { handler: planning_removePlanningParticipants, access: 'leader' },
  'planning/setPlanningEventStatus': { handler: planning_setPlanningEventStatus, access: 'leader' },
  'planning/setPlanningGoalkeeper': { handler: planning_setPlanningGoalkeeper, access: 'leader' },
  'planning/setPlanningStatus': { handler: planning_setPlanningStatus, access: 'leader' },
  'planning/updatePlanningAnswer': { handler: planning_updatePlanningAnswer, access: 'leader' },
  'plans/deletePlanTemplate': { handler: plans_deletePlanTemplate, access: 'leader' },
  'plans/getPlanTemplateTrainings': { handler: plans_getPlanTemplateTrainings, access: 'leader' },
  'plans/getPlanTemplates': { handler: plans_getPlanTemplates, access: 'viewer' },
  'plans/getTrainingPlan': { handler: plans_getTrainingPlan, access: 'viewer' },
  'plans/getTrainingPlanInfo': { handler: plans_getTrainingPlanInfo, access: 'viewer' },
  'plans/getTrainingPlanTemplate': { handler: plans_getTrainingPlanTemplate, access: 'viewer' },
  'plans/linkPlanTemplate': { handler: plans_linkPlanTemplate, access: 'leader' },
  'plans/notifyTrainingGroups': { handler: plans_notifyTrainingGroups, access: 'leader' },
  'plans/notifyTrainingPlan': { handler: plans_notifyTrainingPlan, access: 'leader' },
  'plans/savePlanTemplate': { handler: plans_savePlanTemplate, access: 'leader' },
  'plans/saveTrainingPlan': { handler: plans_saveTrainingPlan, access: 'leader' },
  'plans/unlinkPlanTemplate': { handler: plans_unlinkPlanTemplate, access: 'leader' },
  'plans/updatePlanTemplate': { handler: plans_updatePlanTemplate, access: 'leader' },
  'players/addPlayersToSquad': { handler: players_addPlayersToSquad, access: 'leader' },
  'players/createPlayer': { handler: players_createPlayer, access: 'leader' },
  'players/getOrganizationPlayers': { handler: players_getOrganizationPlayers, access: 'leader' },
  'players/getPlayer': { handler: players_getPlayer, access: 'viewer' },
  'players/getPlayerStats': { handler: players_getPlayerStats, access: 'viewer' },
  'players/getPlayers': { handler: players_getPlayers, access: 'viewer' },
  'players/getSquadGenders': { handler: players_getSquadGenders, access: 'viewer' },
  'players/getSquadStatuses': { handler: players_getSquadStatuses, access: 'viewer' },
  'players/getUpcomingBirthdays': { handler: players_getUpcomingBirthdays, access: 'viewer' },
  'players/removePlayerFromSquad': { handler: players_removePlayerFromSquad, access: 'leader' },
  'players/updatePlayer': { handler: players_updatePlayer, access: 'leader' },
  'replies/applySvenskalagReplies': { handler: replies_applySvenskalagReplies, access: 'leader' },
  'replies/findSvenskalagActivity': { handler: replies_findSvenskalagActivity, access: 'user' },
  'replies/previewSvenskalagReplies': { handler: replies_previewSvenskalagReplies, access: 'leader' },
  'replies/syncSvenskalagReplies': { handler: replies_syncSvenskalagReplies, access: 'leader' },
  'stats/getStatsEvents': { handler: stats_getStatsEvents, access: 'viewer' },
  'stats/getStatsMatches': { handler: stats_getStatsMatches, access: 'viewer' },
  'stats/getStatsOpponents': { handler: stats_getStatsOpponents, access: 'viewer' },
  'stats/getStatsTrainings': { handler: stats_getStatsTrainings, access: 'viewer' },
  'svenskalag/acknowledgeRemovedEvent': { handler: svenskalag_acknowledgeRemovedEvent, access: 'leader' },
  'svenskalag/decideSvenskalagEvent': { handler: svenskalag_decideSvenskalagEvent, access: 'leader' },
  'svenskalag/getSvenskalagStatus': { handler: svenskalag_getSvenskalagStatus, access: 'leader' },
  'svenskalag/syncSvenskalag': { handler: svenskalag_syncSvenskalag, access: 'leader' },
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
