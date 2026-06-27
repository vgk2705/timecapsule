import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { userId, fileType, fileSize, isLegacy } = await request.json()

    if (!userId || !fileType || !fileSize) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (fileType === 'proof') {
      return Response.json({ success: true })
    }

    // ✅ Legacy uploads track storage in legacy_plans, never in storage_usage
    if (isLegacy) {
      const { data: legacyPlan } = await supabase
        .from('legacy_plans')
        .select('storage_used_bytes')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      const newUsed = (legacyPlan?.storage_used_bytes || 0) + fileSize

      await supabase
        .from('legacy_plans')
        .update({ storage_used_bytes: newUsed })
        .eq('user_id', userId)
        .eq('status', 'active')

      return Response.json({ success: true })
    }

    // Regular (Loved/Forever) storage tracking — unchanged
    const { data: existing } = await supabase
      .from('storage_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existing) {
      await supabase
        .from('storage_usage')
        .update({
          total_bytes: existing.total_bytes + fileSize,
          audio_bytes: fileType === 'audio'
            ? existing.audio_bytes + fileSize
            : existing.audio_bytes,
          video_bytes: fileType === 'video'
            ? existing.video_bytes + fileSize
            : existing.video_bytes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    } else {
      await supabase
        .from('storage_usage')
        .insert({
          user_id: userId,
          total_bytes: fileSize,
          audio_bytes: fileType === 'audio' ? fileSize : 0,
          video_bytes: fileType === 'video' ? fileSize : 0,
        })
    }

    return Response.json({ success: true })

  } catch (error) {
    console.error('Confirm upload error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}