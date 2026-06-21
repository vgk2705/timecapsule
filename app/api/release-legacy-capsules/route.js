import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { userId, verificationId } = await request.json()

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get all legacy capsules for this user that haven't been delivered yet
    const { data: capsules, error: capsulesError } = await supabase
      .from('capsules')
      .select('*')
      .eq('sender_id', userId)
      .eq('is_legacy', true)
      .eq('status', 'locked')

    if (capsulesError) throw new Error(capsulesError.message)
    if (!capsules || capsules.length === 0) {
      return Response.json({ sent: 0, message: 'No pending legacy capsules found' })
    }

    let sentCount = 0

    for (const capsule of capsules) {
      try {
        const isAudio = capsule.media_type === 'audio'
        const isVideo = capsule.media_type === 'video'
        const isMedia = isAudio || isVideo

        // ✅ Build the message section based on type — same pattern as send-capsules
        let mediaSection = ''
        if (isAudio && capsule.media_url) {
          mediaSection = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 12px;color:#15803d;font-weight:600;">🎵 Audio Message</p>
              <a href="${capsule.media_url}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                Listen to Audio Message →
              </a>
            </div>`
        } else if (isVideo && capsule.media_url) {
          mediaSection = `
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 12px;color:#1d4ed8;font-weight:600;">🎥 Video Message</p>
              <a href="${capsule.media_url}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                Watch Video Message →
              </a>
            </div>`
        } else {
          // Text message
          mediaSection = `
            <div style="background:#faf5ff;border-left:4px solid #9333ea;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
              <p style="margin:0;color:#581c87;font-style:italic;white-space:pre-wrap;">${capsule.message}</p>
            </div>`
        }

        const emailHtml = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="text-align:center;padding:30px 0;">
              <span style="font-size:48px;">👻💜</span>
            </div>
            <h1 style="color:#581c87;text-align:center;font-size:24px;">A Message From ${capsule.sender_name}</h1>
            <p style="color:#666;text-align:center;font-size:15px;">
              This message was left for you by ${capsule.sender_name}, to be delivered at this time.
            </p>
            ${mediaSection}
            ${isMedia && capsule.media_file_name ? `<p style="color:#999;font-size:13px;text-align:center;">📁 ${capsule.media_file_name}</p>` : ''}
            <p style="color:#999;font-size:13px;text-align:center;margin-top:30px;">
              With love, delivered by TimeCapsule 💜
            </p>
          </div>`

        // Send to primary recipient
        await resend.emails.send({
          from: 'hello@mytimecapsule.app',
          to: capsule.recipient_email,
          subject: `A message from ${capsule.sender_name} 💜`,
          html: emailHtml,
        })

        // Send to additional recipients if any (Forever plan support, though legacy typically has 1)
        if (capsule.recipients && Array.isArray(capsule.recipients) && capsule.recipients.length > 0) {
          for (const extra of capsule.recipients) {
            await resend.emails.send({
              from: 'hello@mytimecapsule.app',
              to: extra.email,
              subject: `A message from ${capsule.sender_name} 💜`,
              html: emailHtml,
            })
          }
        }

        // Mark capsule as delivered
        await supabase
          .from('capsules')
          .update({
            status: 'delivered',
            legacy_delivered_at: new Date().toISOString(),
          })
          .eq('id', capsule.id)

        sentCount++
      } catch (sendError) {
        console.error(`Failed to send capsule ${capsule.id}:`, sendError)
        // Continue with other capsules even if one fails
      }
    }

    return Response.json({ sent: sentCount, total: capsules.length })
  } catch (error) {
    console.error('Release legacy capsules error:', error)
    return Response.json({ error: error.message || 'Failed to release capsules' }, { status: 500 })
  }
}