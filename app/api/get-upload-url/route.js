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

    const fileSizeLimit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.audio
    if (fileSize > fileSizeLimit) {
      return Response.json({
        error: `File too large. Max ${fileSizeLimit / 1024 / 1024}MB allowed for ${fileType}.`
      }, { status: 400 })
    }

    // ✅ Check total storage — legacy uses its own dedicated column, others use storage_usage
    if (fileType !== 'proof') {
      const isLegacy = plan === 'legacy'
      let used = 0

      if (isLegacy) {
        const { data: legacyData } = await supabase
          .from('legacy_plans')
          .select('storage_used_bytes')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()
        used = legacyData?.storage_used_bytes || 0
      } else {
        const { data: storageData } = await supabase
          .from('storage_usage')
          .select('total_bytes')
          .eq('user_id', userId)
          .single()
        used = storageData?.total_bytes || 0
      }

      const limit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.loved

      if (used + fileSize > limit) {
        const usedGB = (used / 1024 / 1024 / 1024).toFixed(2)
        const limitGB = (limit / 1024 / 1024 / 1024).toFixed(0)
        return Response.json({
          error: `Storage limit reached. ${usedGB}GB used of ${limitGB}GB.`
        }, { status: 400 })
      }
    }

    const ext = fileName.split('.').pop()
    const timestamp = Date.now()
    const key = fileType === 'proof'
      ? `proofs/${userId}/${timestamp}.${ext}`
      : `media/${userId}/${timestamp}.${ext}`

    const bucket = fileType === 'proof'
      ? process.env.CLOUDFLARE_R2_BUCKET_PROOFS
      : process.env.CLOUDFLARE_R2_BUCKET_MEDIA

    const presignedUrl = await getPresignedUploadUrl(bucket, key, contentType)

    const publicUrl = fileType === 'proof'
      ? null
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