import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Price by age group in paise (INR × 100)
const LEGACY_PRICING = {
  '20s': { amountINR: 499900, years: 75, labelINR: '₹4,999' },
  '30s': { amountINR: 449900, years: 65, labelINR: '₹4,499' },
  '40s': { amountINR: 399900, years: 55, labelINR: '₹3,999' },
  '50s': { amountINR: 349900, years: 45, labelINR: '₹3,499' },
  '60s': { amountINR: 299900, years: 35, labelINR: '₹2,999' },
  '70s': { amountINR: 249900, years: 25, labelINR: '₹2,499' },
  '80+': { amountINR: 199900, years: 15, labelINR: '₹1,999' },
}

function getAgeGroup(dob) {
  const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 30) return { group: '20s', age }
  if (age < 40) return { group: '30s', age }
  if (age < 50) return { group: '40s', age }
  if (age < 60) return { group: '50s', age }
  if (age < 70) return { group: '60s', age }
  if (age < 80) return { group: '70s', age }
  return { group: '80+', age }
}

export async function POST(request) {
  try {
    const { userId, userDob } = await request.json()
    if (!userId || !userDob) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { group, age } = getAgeGroup(userDob)
    const pricing = LEGACY_PRICING[group]

    if (!pricing) {
      return Response.json({ error: 'Invalid age group calculated' }, { status: 400 })
    }

    const order = await razorpay.orders.create({
      amount: pricing.amountINR,
      currency: 'INR',
      notes: {
        user_id: userId,
        user_dob: userDob,
        age_group: group,
        years_covered: String(pricing.years),
        plan_type: 'legacy'
      }
    })

    return Response.json({
      orderId: order.id,
      amount: pricing.amountINR,
      ageGroup: group,
      age,
      years: pricing.years,
      label: pricing.labelINR,
    })

  } catch (error) {
    console.error('Legacy order error:', error)
    return Response.json({ error: error.message || 'Failed to create order' }, { status: 500 })
  }
}