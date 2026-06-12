import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { userId, fileType, fileSize } = await request.json()

    if (!userId || !fileType || !fileSize) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (fileType === 'proof') {
      return Response.json({ success: true })
    }

    // Update storage usage
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