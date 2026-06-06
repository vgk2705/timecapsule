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
  let warnings30 = 0
  let warnings7 = 0
  let deleted = 0

  // Find all cancelled subscriptions
  const { data: cancelledSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'cancelled')

  if (!cancelledSubs || cancelledSubs.length === 0) {
    return new Response('No cancelled subscriptions', { status: 200 })
  }

  for (const sub of cancelledSubs) {
    const cancelledDate = new Date(sub.updated_at)
    const daysSinceCancelled = Math.floor((today - cancelledDate) / (1000 * 60 * 60 * 24))
    const daysLeft = 180 - daysSinceCancelled

    // Get user info
    let userEmail = null
    let userName = 'there'
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id)
      userEmail = userData?.user?.email
      userName = userData?.user?.user_metadata?.name || 'there'
    } catch {}

    if (!userEmail) continue

    // Get media capsules
    const { data: mediaCapsules } = await supabase
      .from('capsules')
      .select('id, recipient_name, media_type')
      .eq('sender_id', sub.user_id)
      .in('media_type', ['audio', 'video'])
      .eq('status', 'locked')

    if (!mediaCapsules || mediaCapsules.length === 0) continue

    const mediaCount = mediaCapsules.length
    const deletionDate = new Date(cancelledDate)
    deletionDate.setDate(deletionDate.getDate() + 180)
    const deletionDateFormatted = deletionDate.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    // ── 30 DAY WARNING ──────────────────────────
    if (daysSinceCancelled === 150) {
      await resend.emails.send({
        from: 'TimeCapsule <hello@mytimecapsule.app>',
        to: userEmail,
        subject: '⚠️ 30 days left — your TimeCapsule media files',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
            <p style="font-size: 18px; color: #374151;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #6b7280;">This is a reminder that your <strong>${mediaCount} audio/video capsule${mediaCount > 1 ? 's' : ''}</strong> will be permanently deleted in <strong>30 days</strong>.</p>
            <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #c2410c; font-weight: bold; margin: 0 0 8px;">⚠️ Deletion date: ${deletionDateFormatted}</p>
              <p style="color: #9a3412; margin: 0;">Your text capsules are safe forever. Only audio/video media files will be deleted.</p>
            </div>
            <p style="color: #6b7280;">Resubscribe to keep your media files:</p>
            <a href="https://www.mytimecapsule.app/upgrade"
              style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
              Resubscribe →
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 12px;">
              Or pay per capsule — no monthly commitment.
              <a href="https://www.mytimecapsule.app/upgrade#per-capsule" style="color: #b45309;">Learn more →</a>
            </p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              <a href="https://www.mytimecapsule.app/support" style="color: #b45309;">Contact Support</a>
            </p>
          </div>
        `
      })
      warnings30++
    }

    // ── 7 DAY WARNING ───────────────────────────
    if (daysSinceCancelled === 173) {
      await resend.emails.send({
        from: 'TimeCapsule <hello@mytimecapsule.app>',
        to: userEmail,
        subject: '🚨 FINAL WARNING — 7 days to save your TimeCapsule media',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
            <p style="font-size: 18px; color: #374151;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #dc2626; font-weight: bold;">🚨 FINAL WARNING: Your audio/video capsules will be permanently deleted in 7 days!</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #991b1b; font-weight: bold; margin: 0 0 8px;">🗑️ Deletion date: ${deletionDateFormatted}</p>
              <p style="color: #991b1b; margin: 0 0 8px;">${mediaCount} media capsule${mediaCount > 1 ? 's' : ''} will be permanently deleted.</p>
              <p style="color: #991b1b; margin: 0;">This cannot be undone. Text capsules remain safe forever.</p>
            </div>
            <a href="https://www.mytimecapsule.app/upgrade"
              style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 8px 0;">
              Save my capsules now →
            </a>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              <a href="https://www.mytimecapsule.app/support" style="color: #b45309;">Contact Support</a>
            </p>
          </div>
        `
      })
      warnings7++
    }

    // ── 180 DAYS — DELETE MEDIA ─────────────────
    if (daysSinceCancelled >= 180) {
      for (const capsule of mediaCapsules) {
        // TODO: Delete actual file from Cloudflare R2 when storage is built
        // For now: remove media info from capsule, keep text
        await supabase
          .from('capsules')
          .update({
            media_type: null,
            media_url: null,
            media_file_name: null,
            media_file_size: null,
            message: capsule.media_type === 'audio'
              ? '[Audio message expired — subscription was cancelled]'
              : '[Video message expired — subscription was cancelled]',
          })
          .eq('id', capsule.id)
        deleted++
      }

      // Send deletion confirmation email
      await resend.emails.send({
        from: 'TimeCapsule <hello@mytimecapsule.app>',
        to: userEmail,
        subject: '🗑️ TimeCapsule — Media files have been deleted',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
            <p style="font-size: 18px; color: #374151;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #6b7280;">Your grace period has ended and <strong>${mediaCount} media capsule${mediaCount > 1 ? 's have' : ' has'} been deleted</strong>.</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #374151; margin: 0 0 8px;">🗑️ Audio/video files deleted</p>
              <p style="color: #374151; margin: 0;">✅ Text capsules are still safe and will be delivered</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Want to add audio/video again? You can resubscribe or use our per-capsule payment option.</p>
            <a href="https://www.mytimecapsule.app/upgrade"
              style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              See options →
            </a>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              <a href="https://www.mytimecapsule.app/support" style="color: #b45309;">Contact Support</a>
            </p>
          </div>
        `
      })
    }
  }

  return new Response(
    `Done — 30-day warnings: ${warnings30}, 7-day warnings: ${warnings7}, deleted: ${deleted}`,
    { status: 200 }
  )
}