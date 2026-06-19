import Razorpay from 'razorpay'
import { createClient } from '@supabase/supabase-js'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { subscriptionId, userId } = await request.json()

    if (!subscriptionId || !userId) {
      return Response.json({ error: 'Missing subscriptionId or userId' }, { status: 400 })
    }

    await razorpay.subscriptions.cancel(subscriptionId, false)

    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('razorpay_subscription_id', subscriptionId)

    await supabase.from('users').update({ plan: 'free' }).eq('id', userId)

    return Response.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return Response.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 })
  }
}