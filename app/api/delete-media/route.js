import { deleteFromR2 } from '../../lib/r2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { key, userId, fileSize, mediaType, isLegacy } = await request.json()

    await deleteFromR2(process.env.CLOUDFLARE_R2_BUCKET_MEDIA, key)

    if (isLegacy) {
      // Decrement legacy_plans storage
      const { data: legacyPlan } = await supabase
        .from('legacy_plans')
        .select('storage_used_bytes')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (legacyPlan) {
        const newUsed = Math.max(0, (legacyPlan.storage_used_bytes || 0) - (fileSize || 0))
        await supabase
          .from('legacy_plans')
          .update({ storage_used_bytes: newUsed })
          .eq('user_id', userId)
      }
    } else {
      // Decrement regular storage_usage
      const { data: usage } = await supabase
        .from('storage_usage')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (usage) {
        const newTotal = Math.max(0, (usage.total_bytes || 0) - (fileSize || 0))
        const newAudio = mediaType === 'audio' ? Math.max(0, (usage.audio_bytes || 0) - (fileSize || 0)) : usage.audio_bytes
        const newVideo = mediaType === 'video' ? Math.max(0, (usage.video_bytes || 0) - (fileSize || 0)) : usage.video_bytes

        await supabase
          .from('storage_usage')
          .update({
            total_bytes: newTotal,
            audio_bytes: newAudio,
            video_bytes: newVideo,
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