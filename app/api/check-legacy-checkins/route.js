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
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date()

  // Find overdue check-ins
  const { data: overdueCheckins } = await supabase
    .from('checkins')
    .select('*, auth.users!user_id(email)')
    .lt('next_checkin_due', today.toISOString())
    .eq('missed', false)
    .eq('legacy_alert_sent', false)

  if (!overdueCheckins || overdueCheckins.length === 0) {
    return new Response('No overdue checkins', { status: 200 })
  }

  let processed = 0
  for (const checkin of overdueCheckins) {
    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(checkin.user_id)
    const userEmail = userData?.user?.email
    const userName = userData?.user?.user_metadata?.name || 'TimeCapsule user'

    if (userEmail) {
      // Send check-in reminder to user
      await resend.emails.send({
        from: 'TimeCapsule <hello@mytimecapsule.app>',
        to: userEmail,
        subject: '⏳ TimeCapsule Check-in — Are you still with us?',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #7c3aed;">⏳ TimeCapsule Check-in</h1>
            <p style="font-size: 18px; color: #374151;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #6b7280;">This is your 6-month check-in reminder. Your legacy capsules are safely stored.</p>
            <p style="color: #6b7280;">Please confirm you're still with us by clicking below:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://www.mytimecapsule.app/api/checkin-confirm?token=${checkin.checkin_token}"
                style="background: #7c3aed; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
                ✅ Yes, I'm still here
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">If we don't hear from you within 30 days, we'll contact your legacy contact.</p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Sent with care by <a href="https://mytimecapsule.app" style="color: #7c3aed;">TimeCapsule</a>
            </p>
          </div>
        `
      })

      // Mark as missed
      await supabase
        .from('checkins')
        .update({ missed: true })
        .eq('id', checkin.id)

      processed++
    }
  }

  return new Response(`Processed ${processed} overdue checkins`, { status: 200 })
}