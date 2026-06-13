import { deleteFromR2 } from '../../lib/r2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { key, userId, fileSize, mediaType } = await request.json()

    if (!key || !userId) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Delete from R2
    await deleteFromR2(process.env.CLOUDFLARE_R2_BUCKET_MEDIA, key)

    // Update storage usage
    if (fileSize) {
      const { data: existing } = await supabase
        .from('storage_usage')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (existing) {
        await supabase
          .from('storage_usage')
          .update({
            total_bytes: Math.max(0, existing.total_bytes - fileSize),
            audio_bytes: mediaType === 'audio'
              ? Math.max(0, existing.audio_bytes - fileSize)
              : existing.audio_bytes,
            video_bytes: mediaType === 'video'
              ? Math.max(0, existing.video_bytes - fileSize)
              : existing.video_bytes,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete media error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}