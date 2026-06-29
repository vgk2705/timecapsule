import { deleteFromR2 } from '../../lib/r2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GRACE_DAYS = 30 // days after delivery before reclaiming storage

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron-signature')
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - GRACE_DAYS)

  // Find delivered capsules with media still present, delivered before cutoff
  const { data: capsules, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('status', 'delivered')
    .not('media_url', 'is', null)
    .lt('delivered_at', cutoff.toISOString())

  if (error) {
    console.error('Reclaim storage query error:', error)
    return new Response('DB error', { status: 500 })
  }

  if (!capsules || capsules.length === 0) {
    return new Response('No delivered media capsules ready for storage reclaim', { status: 200 })
  }

  let reclaimed = 0
  let totalBytesFreed = 0

  for (const capsule of capsules) {
    try {
      const mediaIndex = capsule.media_url.indexOf('media/')
      const key = mediaIndex !== -1 ? capsule.media_url.substring(mediaIndex) : null

      if (key) {
        try {
          await deleteFromR2(process.env.CLOUDFLARE_R2_BUCKET_MEDIA, key)
        } catch (r2Err) {
          console.error(`R2 delete failed for capsule ${capsule.id}, key ${key}:`, r2Err.message)
        }
      }

      const fileSize = capsule.media_file_size || 0

      // Decrement the correct storage table
      if (capsule.is_legacy) {
        const { data: legacyPlan } = await supabase
          .from('legacy_plans')
          .select('storage_used_bytes')
          .eq('user_id', capsule.sender_id)
          .eq('status', 'active')
          .single()

        if (legacyPlan) {
          const newUsed = Math.max(0, (legacyPlan.storage_used_bytes || 0) - fileSize)
          await supabase
            .from('legacy_plans')
            .update({ storage_used_bytes: newUsed })
            .eq('user_id', capsule.sender_id)
            .eq('status', 'active')
        }
      } else {
        const { data: usage } = await supabase
          .from('storage_usage')
          .select('*')
          .eq('user_id', capsule.sender_id)
          .single()

        if (usage) {
          const newTotal = Math.max(0, (usage.total_bytes || 0) - fileSize)
          const newAudio = capsule.media_type === 'audio' ? Math.max(0, (usage.audio_bytes || 0) - fileSize) : usage.audio_bytes
          const newVideo = capsule.media_type === 'video' ? Math.max(0, (usage.video_bytes || 0) - fileSize) : usage.video_bytes

          await supabase
            .from('storage_usage')
            .update({
              total_bytes: newTotal,
              audio_bytes: newAudio,
              video_bytes: newVideo,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', capsule.sender_id)
        }
      }

      // Clear media fields, keep capsule record + message text as historical record
      await supabase
        .from('capsules')
        .update({
          media_url: null,
          media_file_name: null,
          media_file_size: null,
          message: capsule.media_type === 'audio'
            ? '[Audio message — delivered and archived, storage reclaimed]'
            : '[Video message — delivered and archived, storage reclaimed]',
        })
        .eq('id', capsule.id)

      totalBytesFreed += fileSize
      reclaimed++
    } catch (err) {
      console.error(`Failed to reclaim storage for capsule ${capsule.id}:`, err.message)
    }
  }

  return new Response(
    `Reclaimed storage for ${reclaimed} capsules — ${(totalBytesFreed / 1024 / 1024).toFixed(1)}MB freed`,
    { status: 200 }
  )
}