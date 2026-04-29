import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: capsules, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('unlock_date', today)
    .eq('status', 'locked')

  if (error) return new Response('DB error', { status: 500 })
  if (!capsules || capsules.length === 0) {
    return new Response('No capsules to send today', { status: 200 })
  }

  let sent = 0
  for (const capsule of capsules) {
    const { error: emailError } = await resend.emails.send({
      from: 'TimeCapsule <hello@mytimecapsule.app>',
      to: capsule.recipient_email,
      subject: `💌 A message has been unlocked for you, ${capsule.recipient_name}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
          <p style="font-size: 18px; color: #374151;">Dear <strong>${capsule.recipient_name}</strong>,</p>
          <p style="color: #6b7280;">Someone left you a message — and today is the day it unlocks.</p>
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">${capsule.message}</p>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">Sent with love via TimeCapsule</p>
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