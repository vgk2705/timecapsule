import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Per capsule pricing in paise
const PRICING = {
  INR: {
    audio: {
      '1': 4900,    // ₹49 — within 1 year
      '5': 9900,    // ₹99 — 1-5 years
      '10': 19900,  // ₹199 — 5-10 years
      '10+': 39900, // ₹399 — 10+ years
    },
    video: {
      '1': 14900,   // ₹149
      '5': 29900,   // ₹299
      '10': 49900,  // ₹499
      '10+': 99900, // ₹999
    }
  }
}

function getPriceKey(deliveryYears) {
  if (deliveryYears <= 1) return '1'
  if (deliveryYears <= 5) return '5'
  if (deliveryYears <= 10) return '10'
  return '10+'
}

function getAmount(mediaType, deliveryYears, currency = 'INR') {
  const priceKey = getPriceKey(deliveryYears)
  return PRICING[currency]?.[mediaType]?.[priceKey] || PRICING.INR[mediaType]['5']
}

export async function POST(request) {
  try {
    const { userId, mediaType, unlockDate, currency = 'INR' } = await request.json()

    if (!userId || !mediaType || !unlockDate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate delivery years from today
    const today = new Date()
    const delivery = new Date(unlockDate)
    const deliveryYears = Math.max(1, Math.ceil((delivery - today) / (1000 * 60 * 60 * 24 * 365)))

    const amount = getAmount(mediaType, deliveryYears, currency)
    const priceKey = getPriceKey(deliveryYears)

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      notes: {
        user_id: userId,
        media_type: mediaType,
        delivery_years: deliveryYears,
        plan_type: 'per_capsule',
        price_tier: priceKey,
      }
    })

    return Response.json({
      orderId: order.id,
      amount,
      deliveryYears,
      priceKey,
      mediaType,
      displayPrice: `₹${amount / 100}`,
    })

  } catch (error) {
    console.error('Capsule order error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}