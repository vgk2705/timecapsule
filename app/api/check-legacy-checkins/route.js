import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Required for auth.admin.* calls
)

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron-signature')
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date()
  const { data: overdueCheckins } = await supabase
    .from('checkins')
    .select('*')
    .lt('next_checkin_due', today.toISOString())
    .eq('missed', false)
    .eq('legacy_alert_sent', false)

  if (!overdueCheckins || overdueCheckins.length === 0) {
    return new Response('No overdue checkins', { status: 200 })
  }

  let processed = 0
  for (const checkin of overdueCheckins) {
    let userEmail = null
    let userName = 'there'
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(checkin.user_id)
      if (userError) {
        console.error('Failed to fetch user for checkin:', checkin.id, userError.message)
      }
      userEmail = userData?.user?.email
      userName = userData?.user?.user_metadata?.name || 'there'
    } catch (err) {
      console.error('Exception fetching user for checkin:', checkin.id, err.message)
    }

    if (!userEmail) {
      console.error('Skipping checkin — no email found for user_id:', checkin.user_id)
      continue
    }

    // Send check-in reminder to user
    await resend.emails.send({
      from: 'TimeCapsule <hello@mytimecapsule.app>',
      to: userEmail,
      subject: '⏳ TimeCapsule Check-in — Are you still with us?',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h1 style="color:#7c3aed;">⏳ TimeCapsule</h1>
          <p style="font-size:18px;color:#374151;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;">This is your 6-month check-in reminder. Your legacy capsules are safely stored.</p>
          <p style="color:#6b7280;">Please confirm you're still with us:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="https://www.mytimecapsule.app/api/checkin-confirm?token=${checkin.checkin_token}"
              style="background:#7c3aed;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">
              ✅ Yes, I'm still here
            </a>
          </div>
          <p style="color:#9ca3af;font-size:14px;">If we don't hear from you within 30 days, we'll contact your legacy contacts.</p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
          <p style="color:#9ca3af;font-size:12px;text-align:center;">TimeCapsule · Made with love for families</p>
        </div>
      `
    })

    // Mark as missed + track when reminder was sent
    await supabase
      .from('checkins')
      .update({ missed: true, last_reminder_sent_at: new Date().toISOString() })
      .eq('id', checkin.id)

    // Get ALL legacy contacts for this user
    const { data: legacyContacts } = await supabase
      .from('legacy_contacts')
      .select('*')
      .eq('user_id', checkin.user_id)
      .eq('status', 'active')
      .order('priority', { ascending: true })

    // Email ALL legacy contacts
    if (legacyContacts && legacyContacts.length > 0) {
      for (const contact of legacyContacts) {
        await resend.emails.send({
          from: 'TimeCapsule <hello@mytimecapsule.app>',
          to: contact.contact_email,
          subject: '⚠️ TimeCapsule — Legacy check-in missed',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
              <h1 style="color:#7c3aed;">⏳ TimeCapsule</h1>
              <p>Hi <strong>${contact.contact_name}</strong>,</p>
              <p style="color:#6b7280;">
                <strong>${userName}</strong> has missed their 6-month check-in on TimeCapsule.
                They named you as a legacy contact.
              </p>
              <div style="background:#faf5ff;border-left:4px solid #7c3aed;padding:20px;border-radius:8px;margin:20px 0;">
                <p style="color:#7c3aed;font-weight:bold;margin:0 0 8px;">If ${userName} has passed away:</p>
                <p style="color:#6b7280;margin:0;">Please submit proof of passing using the button below. Our team will personally call you at <strong>${contact.contact_mobile}</strong> to verify before releasing any messages.</p>
              </div>
              <div style="text-align:center;margin:32px 0;">
                <a href="https://www.mytimecapsule.app/legacy/submit-proof"
                  style="background:#7c3aed;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">
                  Submit Proof of Passing →
                </a>
              </div>
              <p style="color:#9ca3af;font-size:14px;text-align:center;">
                If ${userName} is still alive, no action is needed — they will be prompted to check in.
              </p>
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
              <p style="color:#9ca3af;font-size:12px;text-align:center;">TimeCapsule · Made with love for families</p>
            </div>
          `
        })
      }

      // Mark legacy_alert_sent
      await supabase
        .from('checkins')
        .update({ legacy_alert_sent: true })
        .eq('id', checkin.id)
    }

    processed++
  }

  return new Response(`Processed ${processed} overdue checkins`, { status: 200 })
}