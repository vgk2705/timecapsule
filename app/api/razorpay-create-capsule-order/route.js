import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

function getVideoSizeTier(fileSizeBytes) {
  const mb = fileSizeBytes / (1024 * 1024)
  if (mb <= 100) return 'small'
  if (mb <= 500) return 'medium'
  if (mb <= 2048) return 'large'
  return 'too_large'
}

function getDeliveryTier(unlockDate) {
  if (!unlockDate) return '5'
  const years = Math.max(1, Math.ceil(
    (new Date(unlockDate) - new Date()) / (1000 * 60 * 60 * 24 * 365)
  ))
  if (years <= 1) return '1'
  if (years <= 5) return '5'
  if (years <= 10) return '10'
  return '10+'
}

// All prices in paise (INR × 100)
const PRICING = {
  text: {
    '1': 1900,    // ₹19
    '5': 2900,    // ₹29
    '10': 4900,   // ₹49
    '10+': 9900,  // ₹99
  },
  audio: {
    '1': 4900,    // ₹49
    '5': 9900,    // ₹99
    '10': 19900,  // ₹199
    '10+': 39900, // ₹399
  },
  video: {
    small: {
      '1': 14900,   // ₹149
      '5': 29900,   // ₹299
      '10': 49900,  // ₹499
      '10+': 99900, // ₹999
    },
    medium: {
      '1': 29900,    // ₹299
      '5': 59900,    // ₹599
      '10': 99900,   // ₹999
      '10+': 199900, // ₹1,999
    },
    large: {
      '1': 59900,    // ₹599
      '5': 119900,   // ₹1,199
      '10': 199900,  // ₹1,999
      '10+': 399900, // ₹3,999
    }
  }
}

function getPrice(mediaType, fileSizeBytes, unlockDate) {
  const deliveryTier = getDeliveryTier(unlockDate)
  const years = Math.max(1, Math.ceil(
    (new Date(unlockDate || Date.now() + 5 * 365 * 24 * 60 * 60 * 1000) - new Date()) /
    (1000 * 60 * 60 * 24 * 365)
  ))

  if (mediaType === 'text') {
    return {
      amount: PRICING.text[deliveryTier],
      deliveryTier, years, sizeTier: null,
      label: `Text Capsule · ${years} year${years > 1 ? 's' : ''} storage · Unlimited words`,
    }
  }

  if (mediaType === 'audio') {
    return {
      amount: PRICING.audio[deliveryTier],
      deliveryTier, years, sizeTier: null,
      label: `Audio · ${years} year${years > 1 ? 's' : ''} storage`,
    }
  }

  if (mediaType === 'video') {
    const sizeTier = getVideoSizeTier(fileSizeBytes)
    if (sizeTier === 'too_large') {
      return { error: 'Video file too large. Maximum size is 2GB.' }
    }
    return {
      amount: PRICING.video[sizeTier][deliveryTier],
      deliveryTier, years, sizeTier,
      label: `Video · ${sizeTier === 'small' ? 'up to 100MB' : sizeTier === 'medium' ? '101-500MB' : '501MB-2GB'} · ${years} year${years > 1 ? 's' : ''} storage`,
    }
  }

  return { error: 'Invalid media type' }
}

export async function POST(request) {
  try {
    const { userId, mediaType, unlockDate, fileSizeBytes } = await request.json()

    if (!userId || !mediaType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const pricing = getPrice(mediaType, fileSizeBytes || 0, unlockDate)
    if (pricing.error) {
      return Response.json({ error: pricing.error }, { status: 400 })
    }

    const order = await razorpay.orders.create({
      amount: pricing.amount,
      currency: 'INR',
      notes: {
        user_id: userId,
        media_type: mediaType,
        delivery_years: pricing.years,
        size_tier: pricing.sizeTier || 'na',
        plan_type: 'per_capsule',
      }
    })

    return Response.json({
      orderId: order.id,
      amount: pricing.amount,
      displayPrice: `₹${pricing.amount / 100}`,
      deliveryYears: pricing.years,
      deliveryTier: pricing.deliveryTier,
      sizeTier: pricing.sizeTier,
      label: pricing.label,
    })

  } catch (error) {
    console.error('Capsule order error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}