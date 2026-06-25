import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GRACE_PERIOD_DAYS = 30 // days after missed check-in before alerting legacy contacts

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron-signature')
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date()
  let remindersSent = 0
  let contactsAlerted = 0

  // ── STEP 1 — Find checkins that just became overdue (not yet flagged as missed) ──
  const { data: newlyOverdue } = await supabase
    .from('checkins')
    .select('*')
    .lt('next_checkin_due', today.toISOString())
    .eq('missed', false)

  if (newlyOverdue && newlyOverdue.length > 0) {
    for (const checkin of newlyOverdue) {
      let userEmail = null
      let userName = 'there'
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(checkin.user_id)
        if (userError) console.error('getUserById error:', userError.message)
        userEmail = userData?.user?.email
        userName = userData?.user?.user_metadata?.name || 'there'
      } catch (err) {
        console.error('getUserById exception:', err.message)
      }

      if (!userEmail) {
        console.error('Skipping checkin — no email for user_id:', checkin.user_id)
        continue
      }

      // ✅ Only email the user — legacy contacts are NOT notified yet
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
            <p style="color:#9ca3af;font-size:14px;">If we don't hear from you within ${GRACE_PERIOD_DAYS} days, we'll contact your legacy contacts.</p>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
            <p style="color:#9ca3af;font-size:12px;text-align:center;">TimeCapsule · Made with love for families</p>
          </div>
        `
      })

      // Mark as missed + record when the reminder was sent (grace period starts now)
      await supabase
        .from('checkins')
        .update({ missed: true, last_reminder_sent_at: today.toISOString() })
        .eq('id', checkin.id)

      remindersSent++
    }
  }

  // ── STEP 2 — Find checkins that have been missed for GRACE_PERIOD_DAYS+ and not yet alerted ──
  const graceCutoff = new Date()
  graceCutoff.setDate(graceCutoff.getDate() - GRACE_PERIOD_DAYS)

  const { data: overdueGracePeriod } = await supabase
    .from('checkins')
    .select('*')
    .eq('missed', true)
    .eq('legacy_alert_sent', false)
    .lt('last_reminder_sent_at', graceCutoff.toISOString())

  if (overdueGracePeriod && overdueGracePeriod.length > 0) {
    for (const checkin of overdueGracePeriod) {
      let userName = 'there'
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(checkin.user_id)
        userName = userData?.user?.user_metadata?.name || 'there'
      } catch (err) {
        console.error('getUserById exception (step 2):', err.message)
      }

      const { data: legacyContacts } = await supabase
        .from('legacy_contacts')
        .select('*')
        .eq('user_id', checkin.user_id)
        .eq('status', 'active')
        .order('priority', { ascending: true })

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
                  <strong>${userName}</strong> has missed their 6-month check-in on TimeCapsule for over ${GRACE_PERIOD_DAYS} days.
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

        await supabase
          .from('checkins')
          .update({ legacy_alert_sent: true })
          .eq('id', checkin.id)

        contactsAlerted++
      }
    }
  }

  return new Response(
    `Reminders sent: ${remindersSent}, Legacy contacts alerted: ${contactsAlerted}`,
    { status: 200 }
  )
}