// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import { uploadImage } from '../../lib/storage'
import type createTeam from '../../server/functions/teams/createTeam'
import type deleteTeam from '../../server/functions/teams/deleteTeam'
import type getTeams from '../../server/functions/teams/getTeams'
import type updateTeam from '../../server/functions/teams/updateTeam'

type UploadParams = { data: string; fileName: string; mimeType?: string }

export const useCreateTeam = createBackendHook<
  Parameters<typeof createTeam>[0]['params'],
  Awaited<ReturnType<typeof createTeam>>
>('teams/createTeam')

export const useDeleteTeam = createBackendHook<
  Parameters<typeof deleteTeam>[0]['params'],
  Awaited<ReturnType<typeof deleteTeam>>
>('teams/deleteTeam')

export const useGetTeams = createBackendHook<
  Parameters<typeof getTeams>[0]['params'],
  Awaited<ReturnType<typeof getTeams>>
>('teams/getTeams')

export const useUpdateTeam = createBackendHook<
  Parameters<typeof updateTeam>[0]['params'],
  Awaited<ReturnType<typeof updateTeam>>
>('teams/updateTeam')

export const useUploadTeamLogo = createBackendHook<UploadParams, { url: string }>('teams/uploadTeamLogo', (p) => uploadImage(p, 'teams'))
