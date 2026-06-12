import { getPresignedUploadUrl } from '../../lib/r2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STORAGE_LIMITS = {
  loved: 2 * 1024 * 1024 * 1024,
  forever: 5 * 1024 * 1024 * 1024,
  legacy: 1 * 1024 * 1024 * 1024,
}

const FILE_SIZE_LIMITS = {
  audio: 50 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  proof: 10 * 1024 * 1024,
}

export async function POST(request) {
  try {
    const { userId, fileType, fileName, fileSize, contentType, plan } = await request.json()

    if (!userId || !fileType || !fileName || !fileSize || !contentType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check individual file size
    const fileSizeLimit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.audio
    if (fileSize > fileSizeLimit) {
      return Response.json({
        error: `File too large. Max ${fileSizeLimit / 1024 / 1024}MB allowed for ${fileType}.`
      }, { status: 400 })
    }

    // Check total storage for media files
    if (fileType !== 'proof') {
      const { data: storageData } = await supabase
        .from('storage_usage')
        .select('total_bytes')
        .eq('user_id', userId)
        .single()

      const used = storageData?.total_bytes || 0
      const limit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.loved

      if (used + fileSize > limit) {
        const usedGB = (used / 1024 / 1024 / 1024).toFixed(2)
        const limitGB = (limit / 1024 / 1024 / 1024).toFixed(0)
        return Response.json({
          error: `Storage limit reached. ${usedGB}GB used of ${limitGB}GB.`
        }, { status: 400 })
      }
    }

    // Generate file key
    const ext = fileName.split('.').pop()
    const timestamp = Date.now()
    const key = fileType === 'proof'
      ? `proofs/${userId}/${timestamp}.${ext}`
      : `media/${userId}/${timestamp}.${ext}`

    const bucket = fileType === 'proof'
      ? process.env.CLOUDFLARE_R2_BUCKET_PROOFS
      : process.env.CLOUDFLARE_R2_BUCKET_MEDIA

    // Generate presigned URL valid for 1 hour
    const presignedUrl = await getPresignedUploadUrl(bucket, key, contentType)

    const publicUrl = fileType === 'proof'
      ? null // proofs are private
      : `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

    return Response.json({
      presignedUrl,
      publicUrl,
      key,
      bucket,
    })

  } catch (error) {
    console.error('Get upload URL error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}