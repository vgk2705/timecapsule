import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron-signature')

  // Allow Vercel internal cron OR manual trigger with secret
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: capsules, error } = await supabase
    .from('capsules')
    .select('*')
    .lte('unlock_date', today)
    .eq('status', 'locked')

  if (error) return new Response('DB error', { status: 500 })
  if (!capsules || capsules.length === 0) {
    return new Response('No capsules to send today', { status: 200 })
  }

  let sent = 0
  for (const capsule of capsules) {
    const senderName = capsule.sender_name || 'Someone who loves you'
    const relationship = capsule.relationship
      ? capsule.relationship.charAt(0).toUpperCase() + capsule.relationship.slice(1)
      : 'Someone special'

    const senderLabel = capsule.sender_name
      ? `${senderName} (your ${relationship})`
      : relationship

    const { error: emailError } = await resend.emails.send({
      from: 'TimeCapsule <hello@mytimecapsule.app>',
      to: capsule.recipient_email,
      subject: `💌 A message has been unlocked for you, ${capsule.recipient_name}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">

          <h1 style="color: #b45309; font-size: 24px; margin-bottom: 24px;">⏳ TimeCapsule</h1>

          <p style="font-size: 18px; color: #374151; margin-bottom: 8px;">
            Dear <strong>${capsule.recipient_name}</strong>,
          </p>

          <p style="color: #6b7280; margin-bottom: 24px; font-size: 15px;">
            <strong style="color: #b45309;">${senderLabel}</strong> wrote you a message — and today is the day it unlocks. 💛
          </p>

          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <p style="font-size: 16px; color: #1f2937; line-height: 1.8; margin: 0;">${capsule.message}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            This message was written with love and sealed until today — your special day.
          </p>

          <p style="color: #d1d5db; font-size: 12px; margin-top: 12px;">
            📅 Written on: ${new Date(capsule.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            ${capsule.updated_at ? `&nbsp;&nbsp;·&nbsp;&nbsp;✏️ Last edited: ${new Date(capsule.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
          </p>

          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />

          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sent with love via <a href="https://mytimecapsule.app" style="color: #b45309; text-decoration: none;">TimeCapsule</a>
          </p>

        </div>
      `
    })

    if (!emailError) {
      await supabase
        .from('capsules')
        .update({ status: 'delivered' })
        .eq('id', capsule.id)
      sent++
    }
  }

  return new Response(`Sent ${sent} capsules`, { status: 200 })
}