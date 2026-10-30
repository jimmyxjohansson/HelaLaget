// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type addOrganizationAdmin from '../../server/functions/organizations/addOrganizationAdmin'
import type addSquadAdmin from '../../server/functions/organizations/addSquadAdmin'
import type createOrganization from '../../server/functions/organizations/createOrganization'
import type createSquad from '../../server/functions/organizations/createSquad'
import type getOrganizations from '../../server/functions/organizations/getOrganizations'

export const useAddOrganizationAdmin = createBackendHook<
  Parameters<typeof addOrganizationAdmin>[0]['params'],
  Awaited<ReturnType<typeof addOrganizationAdmin>>
>('organizations/addOrganizationAdmin')

export const useAddSquadAdmin = createBackendHook<
  Parameters<typeof addSquadAdmin>[0]['params'],
  Awaited<ReturnType<typeof addSquadAdmin>>
>('organizations/addSquadAdmin')

export const useCreateOrganization = createBackendHook<
  Parameters<typeof createOrganization>[0]['params'],
  Awaited<ReturnType<typeof createOrganization>>
>('organizations/createOrganization')

export const useCreateSquad = createBackendHook<
  Parameters<typeof createSquad>[0]['params'],
  Awaited<ReturnType<typeof createSquad>>
>('organizations/createSquad')

export const useGetOrganizations = createBackendHook<
  Parameters<typeof getOrganizations>[0]['params'],
  Awaited<ReturnType<typeof getOrganizations>>
>('organizations/getOrganizations')
