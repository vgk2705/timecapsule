import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Price by age group in paise (INR × 100)
const LEGACY_PRICING = {
  '20s': { amount: 499900, years: 75, label: '₹4,999' },
  '30s': { amount: 449900, years: 65, label: '₹4,499' },
  '40s': { amount: 399900, years: 55, label: '₹3,999' },
  '50s': { amount: 349900, years: 45, label: '₹3,499' },
  '60s': { amount: 299900, years: 35, label: '₹2,999' },
  '70s': { amount: 249900, years: 25, label: '₹2,499' },
  '80+': { amount: 199900, years: 15, label: '₹1,999' },
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

    const order = await razorpay.orders.create({
      amount: pricing.amount,
      currency: 'INR',
      notes: {
        user_id: userId,
        user_dob: userDob,
        age_group: group,
        years_covered: pricing.years,
        plan_type: 'legacy'
      }
    })

    return Response.json({
      orderId: order.id,
      amount: pricing.amount,
      ageGroup: group,
      age,
      years: pricing.years,
      label: pricing.label,
    })

  } catch (error) {
    console.error('Legacy order error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}