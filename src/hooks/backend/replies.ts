// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.

import { createBackendHook } from './_core'
import type applySvenskalagReplies from '../../server/functions/replies/applySvenskalagReplies'
import type findSvenskalagActivity from '../../server/functions/replies/findSvenskalagActivity'
import type previewSvenskalagReplies from '../../server/functions/replies/previewSvenskalagReplies'

export const useApplySvenskalagReplies = createBackendHook<
  Parameters<typeof applySvenskalagReplies>[0]['params'],
  Awaited<ReturnType<typeof applySvenskalagReplies>>
>('replies/applySvenskalagReplies')

export const useFindSvenskalagActivity = createBackendHook<
  Parameters<typeof findSvenskalagActivity>[0]['params'],
  Awaited<ReturnType<typeof findSvenskalagActivity>>
>('replies/findSvenskalagActivity')

export const usePreviewSvenskalagReplies = createBackendHook<
  Parameters<typeof previewSvenskalagReplies>[0]['params'],
  Awaited<ReturnType<typeof previewSvenskalagReplies>>
>('replies/previewSvenskalagReplies')
