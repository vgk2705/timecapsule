import crypto from 'crypto'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Required for auth.admin calls
)

const PLAN_MAP = {
  'plan_St72dMAHB0gHKt': { plan: 'loved', billing_period: 'monthly' },
  'plan_St74Dk8kUxd0Zr': { plan: 'loved', billing_period: 'yearly' },
  'plan_St7568rdtfILVz': { plan: 'forever', billing_period: 'monthly' },
  'plan_St762JJy6uhmzW': { plan: 'forever', billing_period: 'yearly' },
}

async function getUserEmail(userId) {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error) console.error('getUserEmail error:', error.message)
    return {
      email: data?.user?.email || null,
      name: data?.user?.user_metadata?.name || 'there',
    }
  } catch (err) {
    console.error('getUserEmail exception:', err.message)
    return { email: null, name: 'there' }
  }
}

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(body)
    const eventType = event.event
    console.log('Razorpay webhook:', eventType)

    // ── SUBSCRIPTION ACTIVATED ──────────────────────────────
    if (eventType === 'subscription.activated') {
      const sub = event.payload.subscription.entity
      const userId = sub.notes?.user_id
      const planInfo = PLAN_MAP[sub.plan_id]

      if (userId && planInfo) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .single()

        const subData = {
          plan: planInfo.plan,
          billing_period: planInfo.billing_period,
          status: 'active',
          payment_provider: 'razorpay',
          razorpay_subscription_id: sub.id,
          razorpay_customer_id: sub.customer_id,
          current_period_start: new Date(sub.current_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (existing) {
          await supabase.from('subscriptions').update(subData).eq('user_id', userId)
        } else {
          await supabase.from('subscriptions').insert({ user_id: userId, ...subData })
        }

        await supabase.from('users').update({ plan: planInfo.plan }).eq('id', userId)

        // Send welcome email
        const { email, name } = await getUserEmail(userId)
        if (email) {
          const planName = planInfo.plan === 'forever' ? 'Forever 👑' : 'Loved 💛'
          await resend.emails.send({
            from: 'TimeCapsule <hello@mytimecapsule.app>',
            to: email,
            subject: `🎉 Welcome to TimeCapsule ${planName} plan!`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
                <p style="font-size: 18px; color: #374151;">Hi <strong>${name}</strong>,</p>
                <p style="color: #6b7280;">Your <strong>${planName}</strong> plan is now active! 🎉</p>
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  <p style="color: #92400e; font-weight: bold; margin: 0 0 8px;">What's unlocked:</p>
                  <p style="color: #78350f; margin: 4px 0;">✅ Unlimited text capsules</p>
                  <p style="color: #78350f; margin: 4px 0;">✅ Audio messages</p>
                  <p style="color: #78350f; margin: 4px 0;">✅ Video messages</p>
                  <p style="color: #78350f; margin: 4px 0;">✅ ${planInfo.plan === 'forever' ? '5GB' : '2GB'} media storage</p>
                  ${planInfo.plan === 'forever' ? '<p style="color: #78350f; margin: 4px 0;">✅ Multiple recipients</p>' : ''}
                </div>
                <a href="https://www.mytimecapsule.app/create"
                  style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Create a capsule →
                </a>
                <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  TimeCapsule · <a href="https://mytimecapsule.app/support" style="color: #b45309;">Support</a>
                </p>
              </div>
            `
          })
        }
      }
    }

    // ── SUBSCRIPTION CANCELLED ──────────────────────────────
    if (eventType === 'subscription.cancelled') {
      const sub = event.payload.subscription.entity
      const userId = sub.notes?.user_id

      if (userId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('user_id', userId)

        await supabase.from('users').update({ plan: 'free' }).eq('id', userId)

        // Calculate deletion date (180 days from now)
        const deletionDate = new Date()
        deletionDate.setDate(deletionDate.getDate() + 180)
        const deletionDateFormatted = deletionDate.toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric'
        })

        // Count media capsules
        const { data: mediaCapsules } = await supabase
          .from('capsules')
          .select('id')
          .eq('sender_id', userId)
          .in('media_type', ['audio', 'video'])

        const mediaCount = mediaCapsules?.length || 0

        // Send cancellation email
        const { email, name } = await getUserEmail(userId)
        if (email) {
          await resend.emails.send({
            from: 'TimeCapsule <hello@mytimecapsule.app>',
            to: email,
            subject: '⚠️ Your TimeCapsule subscription has been cancelled',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
                <p style="font-size: 18px; color: #374151;">Hi <strong>${name}</strong>,</p>
                <p style="color: #6b7280;">Your subscription has been cancelled. Here's what happens next:</p>

                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #15803d; font-weight: bold; margin: 0 0 8px;">✅ Good news — your text capsules are safe forever</p>
                  <p style="color: #166534; margin: 0;">All your text messages will be delivered on their scheduled dates. Nothing changes for text capsules.</p>
                </div>

                ${mediaCount > 0 ? `
                <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #c2410c; font-weight: bold; margin: 0 0 8px;">⚠️ ${mediaCount} audio/video capsule${mediaCount > 1 ? 's' : ''} at risk</p>
                  <p style="color: #9a3412; margin: 0 0 8px;">Your media files will be stored for <strong>6 more months</strong> as a grace period.</p>
                  <p style="color: #9a3412; margin: 0;"><strong>Deletion date: ${deletionDateFormatted}</strong></p>
                </div>
                ` : ''}

                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="color: #374151; font-weight: bold; margin: 0 0 12px;">Timeline:</p>
                  <p style="color: #6b7280; margin: 4px 0;">📅 Today — Subscription cancelled</p>
                  <p style="color: #6b7280; margin: 4px 0;">📅 Day 150 — Reminder email sent</p>
                  <p style="color: #6b7280; margin: 4px 0;">📅 Day 173 — Final warning email</p>
                  <p style="color: #6b7280; margin: 4px 0;">📅 Day 180 (${deletionDateFormatted}) — Audio/video files deleted</p>
                  <p style="color: #6b7280; margin: 4px 0;">📅 Forever — Text capsules delivered safely ✅</p>
                </div>

                <p style="color: #6b7280;">Want to keep your media capsules? Resubscribe anytime:</p>
                <a href="https://www.mytimecapsule.app/upgrade"
                  style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
                  Resubscribe →
                </a>

                <p style="color: #6b7280; margin-top: 16px; font-size: 14px;">
                  Or consider our <a href="https://www.mytimecapsule.app/upgrade" style="color: #b45309;">per-capsule payment option</a>
                  — pay only for what you use, no monthly commitment.
                </p>

                <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  Questions? <a href="https://www.mytimecapsule.app/support" style="color: #b45309;">Contact Support</a>
                </p>
              </div>
            `
          })
        }
      }
    }

    // ── SUBSCRIPTION HALTED (payment failed) ──────────────
    if (eventType === 'subscription.halted') {
      const sub = event.payload.subscription.entity
      const userId = sub.notes?.user_id

      if (userId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('user_id', userId)

        await supabase.from('users').update({ plan: 'free' }).eq('id', userId)

        // Send payment failed email
        const { email, name } = await getUserEmail(userId)
        if (email) {
          await resend.emails.send({
            from: 'TimeCapsule <hello@mytimecapsule.app>',
            to: email,
            subject: '❌ TimeCapsule — Payment failed',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
                <p style="font-size: 18px; color: #374151;">Hi <strong>${name}</strong>,</p>
                <p style="color: #6b7280;">We were unable to process your payment and your subscription has been paused.</p>
                <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #c2410c; font-weight: bold; margin: 0 0 8px;">What this means:</p>
                  <p style="color: #9a3412; margin: 4px 0;">✅ Text capsules are safe and will still be delivered</p>
                  <p style="color: #9a3412; margin: 4px 0;">⚠️ Audio/video capsules have a 6-month grace period</p>
                  <p style="color: #9a3412; margin: 4px 0;">⚠️ New audio/video capsule creation is paused</p>
                </div>
                <p style="color: #6b7280;">Please update your payment method to continue:</p>
                <a href="https://www.mytimecapsule.app/upgrade"
                  style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Resubscribe →
                </a>
                <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  Need help? <a href="https://www.mytimecapsule.app/support" style="color: #b45309;">Contact Support</a>
                </p>
              </div>
            `
          })
        }
      }
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 500 })
  }
}