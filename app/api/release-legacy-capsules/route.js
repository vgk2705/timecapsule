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
    if (!userId || !verificationId) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Get all locked legacy capsules for this user
    const { data: capsules, error } = await supabase
      .from('capsules')
      .select('*')
      .eq('sender_id', userId)
      .eq('is_legacy', true)
      .eq('status', 'locked')

    if (error) return Response.json({ error: 'DB error' }, { status: 500 })
    if (!capsules || capsules.length === 0) {
      return Response.json({ sent: 0, message: 'No legacy capsules found' })
    }

    let sent = 0

    for (const capsule of capsules) {
      const senderName = capsule.sender_name || 'Someone who loved you'
      const relationship = capsule.relationship
        ? capsule.relationship.charAt(0).toUpperCase() + capsule.relationship.slice(1)
        : 'Someone special'
      const senderLabel = capsule.sender_name
        ? `${senderName} (your ${relationship})`
        : relationship

      const { error: emailError } = await resend.emails.send({
        from: 'TimeCapsule <hello@mytimecapsule.app>',
        to: capsule.recipient_email,
        subject: `💌 A final message has been left for you, ${capsule.recipient_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">

            <h1 style="color: #7c3aed; font-size: 24px; margin-bottom: 24px;">⏳ TimeCapsule</h1>

            <p style="font-size: 18px; color: #374151; margin-bottom: 8px;">
              Dear <strong>${capsule.recipient_name}</strong>,
            </p>

            <p style="color: #6b7280; margin-bottom: 24px; font-size: 15px;">
              <strong style="color: #7c3aed;">${senderLabel}</strong> wrote you this message before they passed away.
              They wanted you to have it. Please read it knowing it was written with love. 💜
            </p>

            <div style="background: #faf5ff; border-left: 4px solid #7c3aed; padding: 24px; border-radius: 8px; margin: 24px 0;">
              <p style="font-size: 16px; color: #1f2937; line-height: 1.8; margin: 0;">${capsule.message}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              This message was written with love and kept safely until now.
            </p>

            <p style="color: #d1d5db; font-size: 12px; margin-top: 12px;">
              📅 Written on: ${new Date(capsule.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Delivered with love via <a href="https://mytimecapsule.app" style="color: #7c3aed;">TimeCapsule</a>
            </p>
          </div>
        `
      })

      if (!emailError) {
        await supabase
          .from('capsules')
          .update({
            status: 'delivered',
            legacy_delivered_at: new Date().toISOString(),
          })
          .eq('id', capsule.id)
        sent++
      }
    }

    return Response.json({ sent, total: capsules.length })

  } catch (error) {
    console.error('Release legacy error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}