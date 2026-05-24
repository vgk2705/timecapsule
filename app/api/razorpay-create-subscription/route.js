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

// Plan IDs from Razorpay
const PLAN_IDS = {
  loved_monthly: 'plan_St72dMAHB0gHKt',
  loved_yearly: 'plan_St74Dk8kUxd0Zr',
  forever_monthly: 'plan_St7568rdtfILVz',
  forever_yearly: 'plan_St762JJy6uhmzW',
}

export async function POST(request) {
  try {
    const { planKey, userId, userEmail, userName } = await request.json()

    if (!planKey || !userId || !userEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const planId = PLAN_IDS[planKey]
    if (!planId) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: planKey.includes('yearly') ? 10 : 120,
      notes: {
        user_id: userId,
        email: userEmail,
        name: userName || '',
      }
    })

    return Response.json({
      subscriptionId: subscription.id,
      planKey,
    })

  } catch (error) {
    console.error('Razorpay error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}