import { deleteFromR2 } from '../../lib/r2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { key, userId, fileSize, mediaType, isLegacy } = await request.json()

    if (!key) {
      console.error('Delete media called with no key — skipping R2 delete')
      return Response.json({ error: 'Missing file key' }, { status: 400 })
    }

    // ✅ Safety check — if key still looks like a full URL, the prefix strip failed upstream
    if (key.startsWith('http')) {
      console.error('Delete media received a full URL instead of a key:', key)
      return Response.json({ error: 'Invalid key format — received full URL instead of path' }, { status: 400 })
    }

    console.log('Deleting R2 object — bucket:', process.env.CLOUDFLARE_R2_BUCKET_MEDIA, 'key:', key)

    try {
      await deleteFromR2(process.env.CLOUDFLARE_R2_BUCKET_MEDIA, key)
      console.log('R2 delete succeeded for key:', key)
    } catch (r2Error) {
      console.error('R2 delete FAILED for key:', key, r2Error.message)
      // Continue anyway to still decrement storage counters, but log clearly
    }

    if (isLegacy) {
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
          .eq('status', 'active')
      }
    } else {
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