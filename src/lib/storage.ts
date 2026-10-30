'use client'

import { createClient } from './supabase/client'

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'images'

type UploadParams = {
  /** Base64-kodat filinnehåll utan data:-prefix (samma format som i Retool). */
  data: string
  fileName: string
  mimeType?: string
}

/**
 * Laddar upp en bild direkt från webbläsaren till Supabase Storage och
 * returnerar dess publika URL. Ersätter retoolStorage.upload.
 *
 * Uppladdningen går inte via våra API-routes, eftersom Vercel begränsar
 * request-storleken till 4,5 MB och mobilbilder ofta är större.
 */
export async function uploadImage(params: UploadParams, folder: string) {
  const binary = atob(params.data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const safeName = (params.fileName || 'image').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: params.mimeType || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw new Error(`Uppladdningen misslyckades: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}
