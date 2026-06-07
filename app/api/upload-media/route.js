import { uploadToR2 } from '../../lib/r2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// File size limits
const LIMITS = {
  loved: 2 * 1024 * 1024 * 1024,    // 2GB
  forever: 5 * 1024 * 1024 * 1024,  // 5GB
  legacy: 1 * 1024 * 1024 * 1024,   // 1GB
}

const FILE_LIMITS = {
  audio: 50 * 1024 * 1024,   // 50MB per file
  video: 500 * 1024 * 1024,  // 500MB per file
  proof: 10 * 1024 * 1024,   // 10MB for proof docs
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    const capsuleId = formData.get('capsuleId')
    const fileType = formData.get('fileType') // audio, video, proof
    const plan = formData.get('plan') // loved, forever, legacy

    if (!file || !userId || !fileType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check individual file size limit
    const fileSizeLimit = FILE_LIMITS[fileType] || FILE_LIMITS.audio
    if (file.size > fileSizeLimit) {
      return Response.json({
        error: `File too large. Max ${fileSizeLimit / 1024 / 1024}MB for ${fileType}`
      }, { status: 400 })
    }

    // Check total storage usage
    if (fileType !== 'proof') {
      const { data: storageData } = await supabase
        .from('storage_usage')
        .select('total_bytes')
        .eq('user_id', userId)
        .single()

      const used = storageData?.total_bytes || 0
      const limit = LIMITS[plan] || LIMITS.loved

      if (used + file.size > limit) {
        const usedGB = (used / 1024 / 1024 / 1024).toFixed(2)
        const limitGB = (limit / 1024 / 1024 / 1024).toFixed(0)
        return Response.json({
          error: `Storage limit reached. Used ${usedGB}GB of ${limitGB}GB.`
        }, { status: 400 })
      }
    }

    // Generate unique file key
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const key = fileType === 'proof'
      ? `proofs/${userId}/${timestamp}.${ext}`
      : `media/${userId}/${capsuleId || timestamp}.${ext}`

    const bucket = fileType === 'proof'
      ? process.env.CLOUDFLARE_R2_BUCKET_PROOFS
      : process.env.CLOUDFLARE_R2_BUCKET_MEDIA

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const publicUrl = await uploadToR2(bucket, key, buffer, file.type)

    // Update storage usage
    if (fileType !== 'proof') {
      const { data: existing } = await supabase
        .from('storage_usage')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (existing) {
        await supabase
          .from('storage_usage')
          .update({
            total_bytes: existing.total_bytes + file.size,
            audio_bytes: fileType === 'audio'
              ? existing.audio_bytes + file.size
              : existing.audio_bytes,
            video_bytes: fileType === 'video'
              ? existing.video_bytes + file.size
              : existing.video_bytes,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      } else {
        await supabase
          .from('storage_usage')
          .insert({
            user_id: userId,
            total_bytes: file.size,
            audio_bytes: fileType === 'audio' ? file.size : 0,
            video_bytes: fileType === 'video' ? file.size : 0,
          })
      }
    }

    return Response.json({
      url: publicUrl,
      key,
      size: file.size,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}