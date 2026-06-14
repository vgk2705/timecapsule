import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function sendCapsuleEmail(capsule, recipientName, recipientEmail) {
  const senderName = capsule.sender_name || 'Someone who loves you'
  const relationship = capsule.relationship
    ? capsule.relationship.charAt(0).toUpperCase() + capsule.relationship.slice(1)
    : 'Someone special'
  const senderLabel = capsule.sender_name
    ? `${senderName} (your ${relationship})`
    : relationship

  let mediaSection = ''
  if (capsule.media_type === 'audio' && capsule.media_url) {
    mediaSection = `
      <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="font-size:24px;margin:0 0 8px;">🎵</p>
        <p style="color:#15803d;font-weight:bold;margin:0 0 4px;">Audio Message</p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${capsule.media_file_name || 'audio message'}</p>
        <a href="${capsule.media_url}" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          🎵 Listen to Audio Message
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:12px;">Click the button above to listen.</p>
      </div>
    `
  } else if (capsule.media_type === 'video' && capsule.media_url) {
    mediaSection = `
      <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="font-size:24px;margin:0 0 8px;">🎥</p>
        <p style="color:#1d4ed8;font-weight:bold;margin:0 0 4px;">Video Message</p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${capsule.media_file_name || 'video message'}</p>
        <a href="${capsule.media_url}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          🎥 Watch Video Message
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:12px;">Click the button above to watch.</p>
      </div>
    `
  }

  const hasRealMessage = capsule.message &&
    !capsule.message.startsWith('[Audio message:') &&
    !capsule.message.startsWith('[Video message:')

  const textSection = hasRealMessage ? `
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:24px;border-radius:8px;margin:24px 0;">
      <p style="font-size:16px;color:#1f2937;line-height:1.8;margin:0;">${capsule.message}</p>
    </div>
  ` : ''

  return resend.emails.send({
    from: 'TimeCapsule <hello@mytimecapsule.app>',
    to: recipientEmail,
    subject: `💌 A message has been unlocked for you, ${recipientName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <h1 style="color:#b45309;font-size:24px;margin-bottom:24px;">⏳ TimeCapsule</h1>
        <p style="font-size:18px;color:#374151;margin-bottom:8px;">Dear <strong>${recipientName}</strong>,</p>
        <p style="color:#6b7280;margin-bottom:24px;font-size:15px;">
          <strong style="color:#b45309;">${senderLabel}</strong> wrote you a message — and today is the day it unlocks. 💛
        </p>
        ${textSection}
        ${mediaSection}
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">
          This message was written with love and sealed until today — your special day.
        </p>
        <p style="color:#d1d5db;font-size:12px;margin-top:12px;">
          📅 Written on: ${new Date(capsule.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          Sent with love via <a href="https://mytimecapsule.app" style="color:#b45309;text-decoration:none;">TimeCapsule</a>
        </p>
      </div>
    `
  })
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron-signature')
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const { data: capsules, error } = await supabase
    .from('capsules')
    .select('*')
    .lte('unlock_date', today)
    .eq('status', 'locked')
    .eq('is_legacy', false)

  if (error) return new Response('DB error', { status: 500 })
  if (!capsules || capsules.length === 0) {
    return new Response('No capsules to send today', { status: 200 })
  }

  let sent = 0
  for (const capsule of capsules) {
    const allRecipients = []

    // Primary recipient
    allRecipients.push({
      name: capsule.recipient_name,
      email: capsule.recipient_email,
    })

    // Additional recipients (Forever plan)
    if (capsule.recipients && Array.isArray(capsule.recipients)) {
      for (const r of capsule.recipients) {
        if (r.email && r.email !== capsule.recipient_email) {
          allRecipients.push({ name: r.name || r.email, email: r.email })
        }
      }
    }

    let allSent = true
    for (const recipient of allRecipients) {
      const { error: emailError } = await sendCapsuleEmail(capsule, recipient.name, recipient.email)
      if (emailError) {
        console.error(`Failed to send to ${recipient.email}:`, emailError)
        allSent = false
      }
    }

    if (allSent) {
      await supabase
        .from('capsules')
        .update({ status: 'delivered' })
        .eq('id', capsule.id)
      sent++
    }
  }

  return new Response(`Sent ${sent} capsules`, { status: 200 })
}