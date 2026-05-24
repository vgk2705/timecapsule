import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PLAN_MAP = {
  'plan_St72dMAHB0gHKt': { plan: 'loved', billing_period: 'monthly' },
  'plan_St74Dk8kUxd0Zr': { plan: 'loved', billing_period: 'yearly' },
  'plan_St7568rdtfILVz': { plan: 'forever', billing_period: 'monthly' },
  'plan_St762JJy6uhmzW': { plan: 'forever', billing_period: 'yearly' },
}

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    // Verify webhook signature
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

    // Subscription activated
    if (eventType === 'subscription.activated') {
      const sub = event.payload.subscription.entity
      const userId = sub.notes?.user_id
      const planInfo = PLAN_MAP[sub.plan_id]

      if (userId && planInfo) {
        // Check if subscription exists
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              plan: planInfo.plan,
              billing_period: planInfo.billing_period,
              status: 'active',
              payment_provider: 'razorpay',
              razorpay_subscription_id: sub.id,
              razorpay_customer_id: sub.customer_id,
              current_period_start: new Date(sub.current_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
        } else {
          await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan: planInfo.plan,
              billing_period: planInfo.billing_period,
              status: 'active',
              payment_provider: 'razorpay',
              razorpay_subscription_id: sub.id,
              razorpay_customer_id: sub.customer_id,
              current_period_start: new Date(sub.current_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_end * 1000).toISOString(),
            })
        }

        // Update users table plan
        await supabase
          .from('users')
          .update({ plan: planInfo.plan })
          .eq('id', userId)
      }
    }

    // Subscription cancelled
    if (eventType === 'subscription.cancelled') {
      const sub = event.payload.subscription.entity
      const userId = sub.notes?.user_id

      if (userId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        await supabase
          .from('users')
          .update({ plan: 'free' })
          .eq('id', userId)
      }
    }

    // Payment failed
    if (eventType === 'subscription.halted') {
      const sub = event.payload.subscription.entity
      const userId = sub.notes?.user_id

      if (userId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        await supabase
          .from('users')
          .update({ plan: 'free' })
          .eq('id', userId)
      }
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 500 })
  }
}